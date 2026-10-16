// What's built set by address (mockup/src/libs/build/web-audio), on the stand-in for Web Audio:
//   - a param set now, at a time or gliding there; a macro onto its targets; a filter's on every stage;
//   - a delay's time, its sync switch, note and ms, moving its one delay line; following a new tempo while synced;
//   - a param automated; a preset's values set together, a setting it keeps passed over;
//   - an address with no param refused, a setting refused, a placeholder's param left alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';
import { UTILITY } from '../../../plan/format/test/plans.ts';
import { near } from '../../../util/test/near.js';

const BEAT = 0.5; // s: a beat at 120 BPM

// what's built of a plan on a stand-in context at a time, the context's nodes by their kind, a node's param's last event
function built(plan, now = 4) {
  const context = new StandInContext(() => now);
  const what = new WebAudioBuilder({ context, beat: () => BEAT, random: () => 0.5 }).build(plan, {
    into: context.destination,
  });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind);
  return { what, made };
}
// a plan of one block, as a plan has it, at its declared defaults but the values and settings given
function oneBlock(kind, values = {}, settings = {}) {
  const { inputs, outputs, params, settings: declared } = BLOCKS[kind];
  const jack = ({ name, channels = 1 }) => ({ name, channels });
  return {
    version: 1,
    node: {
      name: kind,
      kind,
      inputs: inputs.map(jack),
      outputs: outputs.map(jack),
      params: params.map((spec) => ({ spec, value: values[spec.name] ?? spec.default })),
      settings: declared.map((spec) => ({ spec, value: settings[spec.name] ?? spec.default })),
    },
  };
}
const last = (param) => param.events.at(-1);
// the Utility, its level a macro twice its gain
function doubled() {
  const plan = structuredClone(UTILITY);
  plan.node.macros[0].maps[0].factor = 2;
  return plan;
}

test('a param set by its address: now, at a time, or gliding there from now; a macro onto its targets', () => {
  const { what, made } = built(UTILITY);
  const [gain] = made('gain');
  const [pan] = made('panner');
  what.set(['gain', 'gain'], 0.8);
  assert.deepEqual(last(gain.gain), ['set', 0.8, 4], 'now');
  what.set(['pan', 'pan'], -1, { at: 6 });
  assert.deepEqual(last(pan.pan), ['set', -1, 6], 'at a time');
  what.set(['gain', 'gain'], 0.5, { glide: 0.05 });
  assert.deepEqual(last(gain.gain), ['target', 0.5, 4, 0.05], 'gliding from now');
  what.set(['level'], 0.25, { glide: 0.05 });
  assert.deepEqual(last(gain.gain), ['target', 0.25, 4, 0.05], 'the macro onto its gain');
  const twice = built(doubled());
  twice.what.set(['level'], 0.25);
  assert.deepEqual(last(twice.made('gain')[0].gain), ['set', 0.5, 4], 'mapped: twice its value');
});

test("a filter's frequency and resonance set on every stage, its resonance in Web Audio's dB", () => {
  const { what, made } = built(oneBlock('filter', {}, { slope: '24' }));
  what.set(['frequency'], 900);
  assert.deepEqual(
    made('biquad').map((biquad) => last(biquad.frequency)),
    [
      ['set', 900, 4],
      ['set', 900, 4],
    ],
  );
  what.set(['resonance'], Math.SQRT2);
  const [first, second] = made('biquad').map((biquad) => last(biquad.Q)[1]);
  near(first, 20 * Math.log10(0.5412), 'its first stage stays', 1e-3);
  near(second, 20 * Math.log10(2.6131), 'its second moved by the resonance', 1e-3);
});

test("a delay's time: its note while synced, its ms while free, its switch between them; a new tempo followed while synced, gliding", () => {
  const { what, made } = built(oneBlock('delay'));
  const [delay] = made('delay');
  what.set(['note'], '1/4');
  assert.deepEqual(last(delay.delayTime), ['set', BEAT, 4], 'a quarter at the beat');
  what.set(['ms'], 300);
  assert.deepEqual(last(delay.delayTime), ['set', BEAT, 4], 'its ms kept while synced');
  what.set(['sync'], 0, { at: 5 });
  assert.deepEqual(last(delay.delayTime), ['set', 0.3, 5], 'free: its ms');
  what.tempo(0.25);
  assert.deepEqual(last(delay.delayTime), ['set', 0.3, 5], 'free, a new tempo leaves it');
  what.set(['sync'], 1);
  what.tempo(0.25);
  assert.deepEqual(last(delay.delayTime), ['target', 0.25, 4, 0.3], 'synced: glided to a quarter at the new beat');
  what.tempo(0.5, { at: 8 });
  assert.deepEqual(last(delay.delayTime), ['set', 0.5, 8]);
});

test("a param automated from a time; a macro's automation onto its targets", () => {
  const { what, made } = built(UTILITY);
  const [gain] = made('gain');
  what.automate(
    ['gain', 'gain'],
    [
      ['set', 0, 0],
      ['linear', 1, 1],
    ],
    10,
  );
  assert.deepEqual(gain.gain.events.slice(-2), [
    ['set', 0, 10],
    ['linear', 1, 11],
  ]);
  what.automate(['level'], [['target', 0.5, 0, 0.1]], 12);
  assert.deepEqual(last(gain.gain), ['target', 0.5, 12, 0.1]);
  const twice = built(doubled());
  twice.what.automate(
    ['level'],
    [
      ['linear', 0.25, 1],
      ['cancel', 2],
    ],
    12,
  );
  assert.deepEqual(
    twice.made('gain')[0].gain.events.slice(-2),
    [
      ['linear', 0.5, 13],
      ['cancel', 14],
    ],
    'each value mapped, its time kept; a cancel as it is',
  );
});

test('a preset sent: its values by their addresses set together, at one time; a setting it keeps passed over', () => {
  const { what, made } = built(UTILITY);
  what.preset({ level: 0.25, 'pan/pan': 0.5 }, { 'pan/law': 'stereo' }, { at: 3 });
  assert.deepEqual(
    [last(made('gain')[0].gain), last(made('panner')[0].pan)],
    [
      ['set', 0.25, 3],
      ['set', 0.5, 3],
    ],
  );
});

test("an address with no param refused; a setting refused, a preset's; a placeholder's param left alone", () => {
  const { what } = built(UTILITY);
  assert.throws(() => what.set(['gain', 'cutoff'], 1), /gain\/cutoff: no param/);
  assert.throws(() => what.set(['pan', 'law'], 'pan pot'), /pan\/law: a setting, sent with a preset/);
  const env = built(oneBlock('envelope', { release: 0.3 }));
  assert.deepEqual(env.what.placeholders, [[]]);
  env.what.set(['attack'], 0.2); // nothing built to move
});

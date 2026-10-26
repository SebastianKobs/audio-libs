// The limiter as the builder makes it (mockup/src/libs/modular-audio/build/web-audio/blocks/limiter.ts), on the
// stand-in for Web Audio:
//   - Web Audio's own makeup for a hard knee, taken back after it;
//   - built: its gain into a compressor held at its ceiling, set live in its own units;
//   - automated as any param is, each move made on every Web Audio param behind it, in its units;
//   - its params in its own units: no sound wired into them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into } from './audio-stand-in.js';
import { makeupOf, WebAudioBuilder } from '../index.ts';
import { blockNode, oneBlockPlan } from './blocks.js';
import { near } from '../../../../base/util/test/near.js';

const dB = (gain) => 20 * Math.log10(gain);
const last = (param) => param.events.at(-1);

// a limiter built on a stand-in context at 12 s, into its output; its drive, its compressor and its makeup taken back, in the
// order the sound goes through them
function limiterOn(values) {
  const context = new StandInContext(() => 12);
  const built = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(
    oneBlockPlan('limiter', values),
    { into: context.destination },
  );
  const [back] = into(context, context.destination)
    .flatMap((node) => [node, ...into(context, node)])
    .filter((node) => node.kind === 'gain' && into(context, node).some((before) => before.kind === 'compressor'));
  const [compressor] = into(context, back);
  const [drive] = into(context, compressor);
  return { context, built, drive, compressor, back };
}

test("Web Audio's own makeup, for a hard knee: 0.6 times how far its curve brings full scale down, as measured in Firefox", () => {
  near(makeupOf(-20, 6), 10, 'ratio 6, threshold -20: a -40 dBFS sine came out at -30');
  near(makeupOf(-33, 6), 16.5, 'threshold -33: at -23.5');
  near(makeupOf(0, 6), 0, 'threshold 0: none');
});

test("a limiter, built: its gain into a compressor held at its ceiling as hard as Web Audio's goes, Web Audio's makeup taken back after; set live, in its own units", () => {
  const { built, drive, compressor, back } = limiterOn({ gain: 16, ceiling: -0.3, release: 0.3 });
  near(dB(drive.gain.value), 16, 'its gain, before it');
  assert.deepEqual(
    ['threshold', 'ratio', 'knee', 'attack', 'release'].map((name) => compressor[name].value),
    [-0.3, 20, 0, 0.003, 0.3],
    'it acts at the ceiling',
  );
  near(dB(back.gain.value), -makeupOf(-0.3, 20), "Web Audio's makeup, taken back");
  built.set(['gain'], 17, { at: 12.5, glide: 0.05 });
  built.set(['ceiling'], -3, { at: 12.5, glide: 0.05 });
  near(dB(last(drive.gain)[1]), 17, 'live: each dB more, a dB louder');
  assert.equal(last(drive.gain)[2], 12.5, 'at its time');
  assert.deepEqual(last(compressor.threshold), ['target', -3, 12.5, 0.05], 'its ceiling, where it acts');
  near(dB(last(back.gain)[1]), -makeupOf(-3, 20), 'its makeup followed');
});

test("a limiter's params moved as automation moves any: set, ramped either way, cancelled, each move made on every Web Audio param behind it, in its units", () => {
  const { built, drive, compressor, back } = limiterOn({});
  built.set(['gain'], 6);
  near(dB(last(drive.gain)[1]), 6, 'its gain, in dB');
  built.automate(
    ['ceiling'],
    [
      ['cancel', 0.1],
      ['set', -1, 0.1],
      ['linear', -2, 0.2],
      ['exp', -3, 0.3],
    ],
    12,
  );
  assert.deepEqual(
    compressor.threshold.events.slice(-4),
    [
      ['cancel', 12.1],
      ['set', -1, 12.1],
      ['linear', -2, 12.2],
      ['exp', -3, 12.3],
    ],
    'its ceiling where it acts, in dBFS',
  );
  const [cancelled, ...moves] = back.gain.events.slice(-4);
  assert.deepEqual(cancelled, ['cancel', 12.1], 'behind it too');
  assert.deepEqual(
    moves.map(([kind, , at]) => [kind, at]),
    [
      ['set', 12.1],
      ['linear', 12.2],
      ['exp', 12.3],
    ],
  );
  moves.forEach(([, gain], index) =>
    near(dB(gain), -makeupOf([-1, -2, -3][index], 20), "Web Audio's makeup, taken back"),
  );
});

test("a limiter's params in its own units: a sound wired into one refused", () => {
  const plan = {
    version: 1,
    node: {
      name: 'chain',
      kind: 'Chain',
      inputs: [],
      outputs: [{ name: 'out', channels: 2 }],
      params: [],
      settings: [],
      children: [blockNode('osc', 'oscillator'), blockNode('limit', 'limiter')],
      wires: [
        { from: { node: 'osc', output: 'out' }, to: { node: 'limit', param: 'gain' } },
        { from: { node: 'limit', output: 'out' }, to: { output: 'out' } },
      ],
      macros: [],
      pools: [],
    },
  };
  const context = new StandInContext(() => 12);
  assert.throws(
    () =>
      new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, { into: context.destination }),
    /not a param a sound can be cabled into/,
  );
});

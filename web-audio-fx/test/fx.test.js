// The FX chains' unit tests (mockup/src/libs/web-audio-fx, its test/ folder since X2b), on the engine's stand-in for Web Audio: a chain
// set at a time, or now, and read; the Limiter, Gain and Pan modules as data; a module built on its own, and as a stage. Those on a
// theme's modules, or built into the mixer's FX channels, in mockup/test/unit/fx.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { FxChain, INSERTS, TEMPO_TIME } from '../index.ts';
import { delayBeats, plan } from '../../synth/index.ts';
import { positionOf } from '../../params/index.ts';

let time = 0;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
const into = (ac, node) => ac.rec.edges.filter((e) => e.to === node).map((e) => e.from);
const beat = 60 / 72; // a beat at 72 BPM

test("a chain set at a time, or now, and read: a port's param and node as they were built, a tower's cutoff set at a phrase's first note", () => {
  time = 10;
  const e = new Engine({ AudioContext: Context });
  const ac = e.audioContext;
  const filter = {
    effect: true,
    chain: ['filter'],
    filter: { type: 'lowpass', q: 'q', freq: 'cutoff' },
    params: { q: 0.707, cutoff: 24000 },
  };
  const c = new FxChain(e, {
    between: { input: ac.createGain(), chainOut: ac.createGain() },
    modules: [{ name: 'dull', patch: filter, params: () => ({ q: 0.5 }) }],
    context: { beat, random: () => 0.5 },
  });
  const frequency = c.paramOf('filter.frequency');
  assert.equal(frequency, ac.rec.nodes.find((o) => o.kind === 'biquad').frequency, 'the built param');
  c.setAt('filter.frequency', 1200, 12.5);
  assert.deepEqual(frequency.events.at(-1), ['set', 1200, 12.5], 'at its time, at once');
  c.setNow('filter.frequency', 900);
  assert.deepEqual(frequency.events.at(-1), ['value', 900], 'now, as a value is set');
  assert.equal(c.paramOf('nowhere.gain'), undefined, 'a port no module offers: none');
  assert.equal(
    c.nodeOf('filter'),
    ac.rec.nodes.find((o) => o.kind === 'biquad'),
    'the node offering a port',
  );
  assert.equal(c.nodeOf('nowhere'), undefined, 'none offering it: none');
});

test("the Limiter module, as Ableton's on the master: its gain, ceiling and release its params, 16 dB, -0.3 dBFS and 0.3 s as it starts", async () => {
  const { LIMITER, LIMITER_SETTINGS } = await import('../index.ts');
  assert.deepEqual(
    LIMITER_SETTINGS,
    { gain: 16, ceiling: -0.3, release: 0.3 },
    'the garden at its busiest just under the ceiling',
  );
  const p = plan(LIMITER, {}, { beat, random: () => 0.5 }, { gain: 14 });
  const limiter = p.nodes.find((n) => n.block === 'limiter');
  assert.deepEqual(limiter.params, { gain: [['value', 14]], ceiling: [['value', -0.3]], release: [['value', 0.3]] });
});

// the Gain and Pan modules (F5b): a block each, its port a param; the Utility the two combined, as data, so it can't drift from them
test('the Gain and Pan modules, a block each; the Utility the two combined, as data: a gain, then a pan', async () => {
  const { GAIN, PAN, UTILITY } = await import('../index.ts');
  assert.deepEqual([GAIN.chain, PAN.chain], [['gain'], ['pan']]);
  assert.deepEqual(
    UTILITY,
    { effect: true, chain: ['gain', 'pan'], gain: 'level', pan: 'pan', params: { level: 1, pan: 0 } },
    'a Utility as it was, now their combination',
  );
  const context = { random: () => 0.5 };
  assert.deepEqual(
    plan(GAIN, {}, context, { level: 0.5 }).nodes.map((n) => [n.node, n.params.gain]),
    [['gain', [['value', 0.5]]]],
  );
  assert.deepEqual(
    plan(PAN, {}, context, { pan: -0.3 }).nodes.map((n) => [n.node, n.params.pan]),
    [['panner', [['value', -0.3]]]],
  );
});

// a module built on its own (F5b), as a strip's gains and the mixer's sum and master are: into where its sound goes, its way in and out;
// a port glided through its plan's controls, or given events of its own
test('a module built on its own into where its sound goes: its way in and out, a port glided, or given events of its own', async () => {
  const { BuiltModule, GAIN } = await import('../index.ts');
  time = 10;
  const e = new Engine({ AudioContext: Context });
  const ac = e.audioContext;
  const dest = ac.createGain();
  const m = new BuiltModule(e, { patch: GAIN, params: { level: 0 }, into: dest });
  assert.equal(m.input, m.output, "a Gain's one gain, its way in and out");
  assert.deepEqual(into(ac, dest), [m.output], 'into where its sound goes');
  m.set('gain.gain', 0.6, 0.25);
  m.automate('gain.gain', [
    ['cancel', 10],
    ['set', 0, 10],
  ]);
  assert.deepEqual(m.input.gain.events, [
    ['value', 0],
    ['target', 0.6, 10, 0.25],
    ['cancel', 10],
    ['set', 0, 10],
  ]);
});

// a module built on its own as a stage an emitter sets (F6b, sound/space/emitter.ts): now, at a time, or gliding, as an FX chain is; a port
// it hasn't left alone; its value read back
test('a module built on its own is a stage: a port set now, at a time or gliding, one it lacks left alone, its value read back', async () => {
  const { BuiltModule, FILTER, GAIN } = await import('../index.ts');
  time = 10;
  const e = new Engine({ AudioContext: Context });
  const m = new BuiltModule(e, { patch: GAIN });
  m.setNow('gain.gain', 0.4);
  m.setAt('gain.gain', 0.2, 12);
  m.set('gain.gain', 0.7, 0.08);
  m.setNow('filter.frequency', 900);
  m.setAt('pan.pan', 0.5, 12);
  assert.deepEqual(m.input.gain.events, [
    ['value', 1],
    ['value', 0.4],
    ['set', 0.2, 12],
    ['target', 0.7, 10, 0.08],
  ]);
  assert.equal(m.value('gain.gain'), 0.4, 'its value now, as Web Audio has it');
  const air = new BuiltModule(e, { patch: FILTER });
  air.setNow('gain.gain', 0.3);
  air.setNow('filter.frequency', 900);
  assert.deepEqual(air.input.frequency.events, [
    ['value', 24000],
    ['value', 900],
  ]);
  assert.throws(() => air.value('gain.gain'), /no port gain\.gain/);
});

// a stage gliding from a time to come, as an instrument's note's stage takes a per-note controller at its message's time (V3): a hush
// timed to a beat
test('a module built on its own glides from a time to come where it is given one, from now where it is not', async () => {
  const { BuiltModule, GAIN } = await import('../index.ts');
  time = 10;
  const e = new Engine({ AudioContext: Context });
  const m = new BuiltModule(e, { patch: GAIN });
  m.set('gain.gain', 0, 0.25, 10.5);
  m.set('gain.gain', 1, 0.25);
  assert.deepEqual(m.input.gain.events, [
    ['value', 1],
    ['target', 0, 10.5, 0.25],
    ['target', 1, 10, 0.25],
  ]);
});

// each param a module may be automated by, declared with its taper (U2c4a), as a plugin declares its own
test("the params declared with their tapers: a Utility's level by the fader law, its pan in a line; a Filter's cutoff by octaves; the limiter's in lines; a delay's time in beats by octaves, a 16th triplet to a dotted half, following the tempo", () => {
  const { utility, filter, limiter } = INSERTS;
  assert.deepEqual(
    [utility.params.level.taper, utility.params.pan.taper, filter.params.cutoff.taper, limiter.params.gain.taper],
    ['fader', undefined, 'octaves', undefined],
    'a line where none is named',
  );
  assert.deepEqual(
    [TEMPO_TIME.name, TEMPO_TIME.unit, TEMPO_TIME.taper, TEMPO_TIME.range.slice(0, 2)],
    ['time', 'beats', 'octaves', [delayBeats('1/16t', 1), delayBeats('1/2.', 1)]],
  );
  assert.ok(
    Math.abs(positionOf(TEMPO_TIME, delayBeats('1/8', 1)) - 0.4) < 0.1,
    "an 8th, a little under halfway, as an octave's share",
  );
});

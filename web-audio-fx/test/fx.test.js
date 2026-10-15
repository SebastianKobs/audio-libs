// The FX chains' unit tests (mockup/src/libs/web-audio-fx, its test/ folder since X2b), on the engine's stand-in for Web Audio: a chain
// set at a time, or now, and read; a chain and a module following an edit; the Limiter, Gain and Pan modules as data; a module built on
// its own, and as a stage. Those on a theme's modules, or built into the mixer's FX channels, in mockup/test/unit/fx.test.js
import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn, into } from '../../web-audio-engine/test/audio-stand-in.js';
import { DEVICES, FILTER, FxChain, GAIN, PAN_POT, RING_OUT, UTILITY } from '../index.ts';
import { DELAY_TIME, NO_DRAWS, plan } from '../../synth/index.ts';
import { SMOOTHING } from '../../audio-plan/index.ts';
import { dBOf, isSwitch, NOTE_VALUES } from '../../params/index.ts';

let time = 0;
const beat = 60 / 72; // a beat at 72 BPM

test("a chain set at a time, or now, and read: a port's param and node as they were built, a tower's cutoff set at a phrase's first note", () => {
  time = 10;
  const e = engineOn(() => time);
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
  c.set('filter.frequency', 1200, { at: 12.5 });
  assert.deepEqual(frequency.events.at(-1), ['set', 1200, 12.5], 'at its time, at once');
  c.set('filter.frequency', 900, 'now');
  assert.deepEqual(frequency.events.at(-1), ['value', 900], 'now, as a value is set');
  assert.equal(c.paramOf('nowhere.gain'), undefined, 'a port no module offers: none');
  assert.equal(
    c.nodeOf('filter').node,
    ac.rec.nodes.find((o) => o.kind === 'biquad'),
    'the node offering a port',
  );
  assert.equal(c.nodeOf('nowhere'), undefined, 'none offering it: none');
  assert.deepEqual(
    [c.paramValue('q'), c.paramValue('cutoff'), c.paramValue('nowhere')],
    [0.5, 24000, undefined],
    "a param by its name as the chain plays it, a port or none: its module's params now over its patch's; none where none has it",
  );
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

// a chain following its modules as they are now (DRY17), an editor having changed one: each planned again with the draws it made, and
// glided there on the chain as built; a change of structure the only rebuild, the old chain ringing out beside the new
test('a chain follows its modules as they are now: a changed value glided there on the chain as built, its draws kept; a change of structure rebuilds it', () => {
  mock.timers.enable({ apis: ['setTimeout'] }); // an old chain rings out before it's let go
  try {
    time = 10;
    const e = engineOn(() => time);
    const ac = e.audioContext;
    let drawn = 0;
    const params = { cutoff: 900 };
    const wobbled = {
      effect: true,
      chain: ['filter'],
      filter: { type: 'lowpass', freq: 'cutoff' },
      lfos: [{ rate: { between: [0.3, 0.6] }, depth: 50, target: 'filter.frequency', free: true }],
    };
    const c = new FxChain(e, {
      between: { input: ac.createGain(), chainOut: ac.createGain() },
      modules: [{ name: 'dull', patch: wobbled, params: () => params }],
      context: { beat, random: () => (drawn += 0.25) },
    });
    const made = ac.rec.nodes.length;
    const [filter] = ac.rec.nodes.filter((o) => o.kind === 'biquad');
    const lfo = ac.rec.nodes.find((o) => o.kind === 'oscillator');
    time = 12;
    params.cutoff = 600;
    c.follow();
    assert.equal(ac.rec.nodes.length, made, 'no node made');
    assert.deepEqual(filter.frequency.events.at(-1), ['target', 600, 12, SMOOTHING], 'glided there from now');
    assert.equal(lfo.frequency.events.length, 1, 'its rate drawn as it was');
    assert.equal(c.valueOf('filter.frequency'), 600, 'as it plays now');
    wobbled.filter = { ...wobbled.filter, type: 'highpass' };
    c.follow();
    assert.equal(ac.rec.nodes.filter((o) => o.kind === 'biquad').length, 2, 'a change of structure: built again');
    mock.timers.tick(RING_OUT);
    assert.equal(lfo.stops.length, 1, 'the old one let go once it has rung out');
  } finally {
    mock.timers.reset();
  }
});

// a module built on its own following its plan edited (DRY17), as a chain's parts do: from where it plays, on the context's clock
test('a module built on its own follows its plan edited from now: a changed value glided there, one told ahead of its time kept; false where its structure changed, nothing done', async () => {
  const { BuiltModule } = await import('../index.ts');
  time = 4;
  const e = engineOn(() => time);
  const m = new BuiltModule(e, { patch: FILTER });
  const filter = m.input;
  time = 10;
  m.set('filter.frequency', 900, { at: 12 });
  assert.equal(m.follow(plan(FILTER, {}, NO_DRAWS, { q: 2 })), true);
  assert.deepEqual(filter.Q.events, [
    ['value', dBOf(1.085)],
    ['target', dBOf(2), 10, SMOOTHING],
  ]); // a resonance a ratio, in Web Audio's dB
  assert.deepEqual(
    filter.frequency.events,
    [
      ['value', 24000],
      ['set', 900, 12],
    ],
    'its cutoff as told, ahead of its time',
  );
  assert.deepEqual(m.plan.nodes[0].params.Q, [['value', 2]], 'its plan the edited one');
  assert.equal(m.follow(plan(GAIN, {}, NO_DRAWS)), false, 'a change of structure');
  assert.equal(filter.Q.events.length, 2, 'nothing done');
});

// a module built on its own (F5b), as a strip's gains and the mixer's sum and master are: into where its sound goes, its way in and out;
// a port glided through its plan's controls, or given events of its own
test('a module built on its own into where its sound goes: its way in and out, a port glided, or given events of its own', async () => {
  const { BuiltModule, GAIN } = await import('../index.ts');
  time = 10;
  const e = engineOn(() => time);
  const ac = e.audioContext;
  const dest = ac.createGain();
  const m = new BuiltModule(e, { patch: GAIN, params: { level: 0 }, into: dest });
  assert.equal(m.input, m.output, "a Gain's one gain, its way in and out");
  assert.deepEqual(into(ac, dest), [m.output], 'into where its sound goes');
  m.set('gain.gain', 0.6, { glide: 0.25 });
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

// a module built on its own as a stage set from outside (F6b): now, at a time, or gliding, as an FX chain is; a port it hasn't left
// alone; its value read back
test('a module built on its own is a stage: a port set now, at a time or gliding, by one timing (DRY8a), one it lacks left alone, its value read back', async () => {
  const { BuiltModule, FILTER, GAIN } = await import('../index.ts');
  time = 10;
  const e = engineOn(() => time);
  const m = new BuiltModule(e, { patch: GAIN });
  m.set('gain.gain', 0.4, 'now');
  m.set('gain.gain', 0.2, { at: 12 });
  m.set('gain.gain', 0.7, { glide: 0.08 });
  m.set('filter.frequency', 900, 'now');
  m.set('pan.pan', 0.5, { at: 12 });
  assert.deepEqual(m.input.gain.events, [
    ['value', 1],
    ['value', 0.4],
    ['set', 0.2, 12],
    ['target', 0.7, 10, 0.08],
  ]);
  assert.equal(m.value('gain.gain'), 0.4, 'its value now, as Web Audio has it');
  const air = new BuiltModule(e, { patch: FILTER });
  air.set('gain.gain', 0.3, 'now');
  air.set('filter.frequency', 900, 'now');
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
  const e = engineOn(() => time);
  const m = new BuiltModule(e, { patch: GAIN });
  m.set('gain.gain', 0, { glide: 0.25, from: 10.5 });
  m.set('gain.gain', 1, { glide: 0.25 });
  assert.deepEqual(m.input.gain.events, [
    ['value', 1],
    ['target', 0, 10.5, 0.25],
    ['target', 1, 10, 0.25],
  ]);
});

// each param a module may be automated by, declared with its taper (U2c4a), as a plugin declares its own
test("the params declared with their tapers: a Utility's level by the fader law, its pan in a line; a Filter's cutoff by octaves; the limiter's in lines; a delay's time with a sync switch, its note values, its ms by octaves", () => {
  const { utility, filter, limiter } = DEVICES;
  assert.deepEqual(
    [utility.params.level.taper, utility.params.pan.taper, filter.params.cutoff.taper, limiter.params.gain.taper],
    ['fader', undefined, 'octaves', undefined],
    'a line where none is named',
  );
  const { sync, note, ms } = DELAY_TIME;
  assert.ok(isSwitch(sync));
  assert.deepEqual(note.choices, NOTE_VALUES);
  assert.deepEqual([ms.unit, ms.taper, ms.range.slice(0, 2)], ['ms', 'octaves', [1, 4000]], 'up to its longest time');
});

// each device, by the name a strip's data gives it (U2c4b1a, DRY9a): its name as its device shows it, its module, its params declared
// and its ports by its params' names, where a param's value is set on its chain, so none is named by hand
test("each device: its name, its module, its params and its ports; a Gain's level, a Pan's pan, a Utility's both, the pan pot Utility a Gain then a pan pot, a Filter's cutoff, the limiter's three; a param set only as it's built, none", () => {
  const { gain, pan, utility, filter, limiter } = DEVICES;
  assert.deepEqual([gain.ports, pan.ports], [{ level: 'gain.gain' }, { pan: 'pan.pan' }]);
  assert.deepEqual(utility.ports, { level: 'gain.gain', pan: 'pan.pan' });
  assert.deepEqual(filter.ports, { cutoff: 'filter.frequency' }, 'its resonance fixed as it was built');
  assert.deepEqual(limiter.ports, { gain: 'limiter.gain', ceiling: 'limiter.ceiling', release: 'limiter.release' });
  assert.deepEqual(
    [utility, filter, limiter].map((device) => device.name),
    ['Utility', 'LP filter', 'Limiter'],
    'as its device shows it',
  );
  assert.equal(utility.patch, UTILITY);
  assert.deepEqual(
    Object.values(DEVICES).map((device) => device.kind),
    ['gain', 'pan', 'utility', 'utility', 'filter', 'limiter'],
    'its kind: the two Utilities one, as their device shows them',
  );
  const panPot = DEVICES['pan pot utility'];
  assert.deepEqual([panPot.name, panPot.params, panPot.ports], [utility.name, utility.params, utility.ports]);
  assert.deepEqual(panPot.patch.chain, ['gain', 'pan'], 'a Gain, then a Pan');
  assert.deepEqual([panPot.patch.gain, panPot.patch.pan], [GAIN.gain, PAN_POT.pan], 'its pan a pan pot');
  assert.deepEqual(panPot.patch.params, UTILITY.params);
});

// what a chain's modules' nodes offer to read, as built, a limiter's (U2c5c): the points a meter reads inside it, by name, its in after its
// gain and its out; its readings by name, what it takes away now; none where no node offers one
test("what a chain's modules offer to read: the points a meter reads inside them and their readings, by name, as built; none where none offers one", async () => {
  const { LIMITER } = await import('../index.ts');
  time = 10;
  const e = engineOn(() => time);
  const ac = e.audioContext;
  const chain = new FxChain(e, {
    between: { input: ac.createGain(), chainOut: ac.createGain() },
    modules: [{ name: 'limiter', patch: LIMITER }],
    context: { beat, random: () => 0.5 },
  });
  const points = chain.points();
  assert.deepEqual(Object.keys(points), ['in', 'out']);
  assert.deepEqual(
    [points.in.kind, points.out.kind],
    ['gain', 'gain'],
    'its in, after its gain, and its out: nodes a meter can read',
  );
  const readings = chain.readings();
  assert.deepEqual(Object.keys(readings), ['reduction']);
  assert.equal(typeof readings.reduction(), 'number', 'what it takes away now');
  const plain = new FxChain(e, {
    between: { input: ac.createGain(), chainOut: ac.createGain() },
    modules: [{ name: 'level', patch: (await import('../index.ts')).GAIN }],
    context: { beat, random: () => 0.5 },
  });
  assert.deepEqual([plain.points(), plain.readings()], [{}, {}], 'none where none offers one');
});

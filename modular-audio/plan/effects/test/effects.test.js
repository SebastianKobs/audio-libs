// The effects' unit tests (mockup/src/libs/modular-audio/plan/effects): each a template, as its YAML writes it.
//   - every effect, each of the effect's form, one input and one output, its label where it has one, planned with no failure;
//     the Tape delay the Delay's;
//   - their params macros by the names a desk keys them, the Utility's level the fader's;
//   - the Delay's note a choice through its macro; the Utility's pan pot a setting; the Reverb's length one;
//   - every macro its hint, the words a device shows;
//   - the Drive planned whole: every node of its chain a block, its macros onto the chain, its steep high cut a 5th-order Butterworth;
//   - every other effect planned whole, each node a block, its macros onto its blocks, at its defaults, and what it's played with:
//     the Chorus's lags, the Ducker's events, the Juno chorus's rates, the tape echo's glide, the PCM-60's values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_FORM } from '../index.ts';
import { chorusLags, chorusValues, duckEvents, JUNO_CHORUS, PCM60, PCM60_DECAY, TAPE_GLIDE } from '../index.ts';
import { EFFECT_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { BLOCKS } from '../../blocks/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
import { near } from '../../../../base/util/test/near.js';

const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);

// a planned effect's macros by name, each its value
function macrosOf(kind, asked) {
  const { macros } = planner.plan(kind, asked).node;
  return Object.fromEntries(macros.map((macro) => [macro.spec.name, macro.value]));
}

test("the effects, each of the effect's form, one input and one output, each planned, its label the name a device shows it by where it isn't its kind; the Tape delay the Delay's, its own label", () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map(({ kind }) => {
      const { form, label } = planner.plan(kind).node;
      return [kind, form, label];
    }),
    [
      ['Utility', 'effect', undefined],
      ['Filter', 'effect', 'LP filter'],
      ['Limiter', 'effect', undefined],
      ['Lookahead limiter', 'effect', undefined],
      ['Delay', 'effect', undefined],
      ['TapeDelay', 'effect', 'Tape delay'],
      ['Reverb', 'effect', undefined],
      ['Drive', 'effect', undefined],
      ['Crusher', 'effect', undefined],
      ['Chorus', 'effect', undefined],
      ['Ducker', 'effect', undefined],
      ['Grains', 'effect', undefined],
      ['Align', 'effect', undefined],
      ['EQ', 'effect', undefined],
      ['Isolator', 'effect', undefined],
      ['Compressor', 'effect', undefined],
      ['JunoChorus', 'effect', 'Juno chorus'],
      ['TapeEcho', 'effect', 'Tape echo'],
      ['Hiss', 'effect', undefined],
      ['Room', 'effect', 'Room'],
    ],
  );
  const tape = planner.plan('TapeDelay').node;
  assert.deepEqual(
    tape.children.map((child) => child.name),
    ['line', 'lowpass', 'loop', 'wobble', 'depth'],
    "the Delay's, then its wobble",
  );
  assert.deepEqual(tape.wires.at(-1), { from: { node: 'depth', output: 'out' }, to: { node: 'line', param: 'ms' } });
});

test("their params macros by the names a desk keys them, each at its default as it starts: a desk's keys and its lanes' names kept; the Utility's level the fader's, in dB", () => {
  assert.deepEqual(macrosOf('Utility'), { level: 1, pan: 0 });
  assert.deepEqual(macrosOf('Filter'), { cutoff: 24000, q: 0.707 });
  assert.deepEqual(macrosOf('Limiter'), { gain: 0, ceiling: -0.3, release: 0.3 });
  assert.deepEqual(macrosOf('Lookahead limiter'), { gain: 0, ceiling: -1, release: 0.3, clip: 3 });
  assert.deepEqual(macrosOf('Delay'), { sync: 1, note: '1/8', ms: 417, feedback: 0.45, tone: 2400 });
  assert.deepEqual(macrosOf('TapeDelay'), { ...macrosOf('Delay'), rate: 0.5, depth: 0.004 }, '0.5 Hz, 4 ms either way');
  assert.deepEqual(macrosOf('Reverb'), {}, 'its length a setting');
  assert.deepEqual(macrosOf('Drive'), {
    drive: 1,
    punish: 0,
    style: 'smooth',
    'low cut': 20,
    thump: 0,
    tone: 1,
    'high cut': 20000,
    steep: 0,
    auto: 1,
    mix: 1,
    output: 1,
    oversample: '4x',
  });
  assert.deepEqual(
    paramAt(planner.plan('Utility'), ['level']).spec,
    { ...BLOCKS.gain.params[0], name: 'level' },
    "the fader's, in dB",
  );
});

test("the Delay's note a choice through its macro, onto its line; the Utility's pan pot and the Reverb's length settings", () => {
  const delay = planner.plan('Delay', { values: { note: '1/4', feedback: 0.6 } });
  assert.equal(paramAt(delay, ['line', 'note']).value, '1/4');
  assert.equal(paramAt(delay, ['loop', 'gain']).value, 0.6);
  assert.throws(
    () => planner.plan('Delay', { values: { note: 99 } }),
    { message: 'note: no choice 99' },
    'an index past its choices',
  );
  const utility = planner.plan('Utility', { settings: { 'pan/law': 'pan pot' } });
  assert.equal(settingAt(utility, ['pan', 'law']).value, 'pan pot');
  assert.equal(settingAt(planner.plan('Reverb'), ['length']).value, 3.5);
  assert.equal(
    settingAt(planner.plan('Reverb', { settings: { length: 2 } }), ['room', 'length']).value,
    2,
    "the room's, its own stands for",
  );
});

test("every effect's macros hinted, the words a device shows beside their knobs, from its template: all of an effect's or none yet (the Delay's and the Tape delay's write none), but the Tape echo's line's own time macros, the Delay's", () => {
  for (const { kind } of EFFECT_TEMPLATES) {
    const { macros } = planner.plan(kind).node;
    for (const { spec, hint } of macros.filter((macro) => macro.hint !== undefined)) {
      assert.ok(hint.length > 10, `${kind}/${spec.name}: its hint says something`);
    }
    const timeOfItsLine = kind === 'TapeEcho' ? ['sync', 'note', 'ms'] : [];
    const unhinted = macros
      .filter(({ hint }) => hint === undefined)
      .map(({ spec }) => spec.name)
      .filter((name) => !timeOfItsLine.includes(name));
    if (unhinted.length < macros.length - timeOfItsLine.length) {
      assert.deepEqual(unhinted, [], `${kind}: no macro without a hint`);
    }
  }
  assert.match(planner.plan('Limiter').node.macros[1].hint, /^The limiter: where it acts, in dBFS/);
  assert.match(planner.plan('Lookahead limiter').node.macros[1].hint, /^The limiter: the true peak it holds/);
});

// a planned effect's param or setting value, by its address
const value = (plan, ...address) => paramAt(plan, address)?.value;
const settingValue = (plan, ...address) => settingAt(plan, address)?.value;

test('the Drive planned whole, every node of its chain a block the libraries declare', () => {
  const { children } = planner.plan('Drive').node;
  assert.deepEqual(
    children.map(({ kind }) => kind),
    [
      'filter',
      'tilt',
      'saturation',
      'one pole',
      'filter',
      'filter',
      'gain',
      'gain',
      'gain',
      'shaper lag',
      'gain',
      'gain',
    ],
  );
  for (const { kind } of children) {
    assert.ok(BLOCKS[kind], `${kind}: a block`);
  }
});

test("the Drive's controls onto its chain: lows cut and tilted before the curve, the fizz cut after, mixed, trimmed", () => {
  const values = {
    drive: 8,
    punish: 1,
    style: 'triode',
    'low cut': 150,
    thump: 1,
    tone: 2,
    'high cut': 9000,
    steep: 1,
    auto: 0.7,
    mix: 0.4,
    output: 0.8,
    oversample: '2x',
  };
  const plan = planner.plan('Drive', { values });
  assert.equal(value(plan, 'saturation', 'drive'), 8);
  assert.equal(value(plan, 'saturation', 'punish'), 1);
  assert.equal(value(plan, 'saturation', 'style'), 'triode');
  assert.equal(value(plan, 'saturation', 'auto'), 0.7);
  assert.equal(value(plan, 'saturation', 'oversample'), '2x');
  assert.equal(value(plan, 'lag', 'oversample'), '2x', 'the dry held back as long as the wet');
  assert.equal(settingValue(plan, 'lows', 'type'), 'highpass');
  assert.equal(value(plan, 'lows', 'frequency'), 150);
  near(value(plan, 'lows', 'resonance'), Math.SQRT2, 'thump: +3 dB at the cut', 0.01);
  assert.equal(value(plan, 'tilt', 'tilt'), 2);
  for (const highs of ['highs', 'steep 1', 'steep 2']) {
    assert.equal(value(plan, highs, 'frequency'), 9000, highs);
  }
  assert.equal(value(plan, 'gentle', 'gain'), 0);
  assert.equal(value(plan, 'steeper', 'gain'), 1, 'steep: 30 dB an octave');
  assert.equal(value(plan, 'wet', 'gain'), 0.4);
  near(value(plan, 'dry', 'gain'), 0.6, 'the dry the rest');
  assert.equal(value(plan, 'trim', 'gain'), 0.8);
  for (const name of ['drive', 'tone', 'output']) {
    assert.equal(paramAt(plan, [name]).spec.dB, true, `${name}: a share shown in dB`);
  }
});

test("the Drive's steep high cut a 5th-order Butterworth: its one pole and two biquads at their Qs", () => {
  const plan = planner.plan('Drive');
  near(value(plan, 'steep 1', 'resonance'), 1 / (2 * Math.cos(Math.PI / 5)), 'the first biquad', 1e-3);
  near(value(plan, 'steep 2', 'resonance'), 1 / (2 * Math.cos((2 * Math.PI) / 5)), 'the second biquad', 1e-3);
});

test('the Drive at its defaults near as it came: no drive, smooth, its level held, open, all wet, at unity, 4x', () => {
  const plan = planner.plan('Drive');
  assert.equal(value(plan, 'saturation', 'drive'), 1);
  assert.equal(value(plan, 'saturation', 'punish'), 0);
  assert.equal(value(plan, 'saturation', 'style'), 'smooth');
  assert.equal(value(plan, 'saturation', 'auto'), 1);
  assert.equal(value(plan, 'saturation', 'oversample'), '4x');
  assert.equal(value(plan, 'lows', 'frequency'), 20);
  near(value(plan, 'lows', 'resonance'), Math.SQRT1_2, 'flat: no thump', 1e-3);
  assert.equal(value(plan, 'tilt', 'tilt'), 1);
  assert.equal(value(plan, 'highs', 'frequency'), 20000);
  assert.equal(value(plan, 'gentle', 'gain'), 1);
  assert.equal(value(plan, 'steeper', 'gain'), 0);
  assert.equal(value(plan, 'wet', 'gain'), 1);
  assert.equal(value(plan, 'trim', 'gain'), 1);
});

// a plan's wires as 'from > to', a param's as 'to:param'
const wiresOf = (plan) =>
  plan.node.wires.map(({ from, to }) => `${from.node ?? 'in'} > ${to.node ?? 'out'}${to.param ? `:${to.param}` : ''}`);
const childrenOf = (plan) => plan.node.children.map(({ name, kind }) => [name, kind]);

test('every effect planned, stereo in, each node of its chain a block the libraries declare', () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map(({ kind }) => kind),
    ['Utility', 'Filter', 'Limiter', 'Lookahead limiter', 'Delay', 'TapeDelay', 'Reverb', 'Drive']
      .concat(['Crusher', 'Chorus', 'Ducker', 'Grains', 'Align', 'EQ', 'Isolator', 'Compressor'])
      .concat(['JunoChorus', 'TapeEcho', 'Hiss', 'Room']),
  );
  for (const { kind } of EFFECT_TEMPLATES) {
    const plan = planner.plan(kind, { beat: 0.5 });
    assert.equal(plan.node.form, 'effect', kind);
    assert.deepEqual(plan.node.inputs, [{ name: 'in', channels: 2 }], kind);
    for (const child of plan.node.children) {
      assert.ok(BLOCKS[child.kind], `${kind}/${child.name}: ${child.kind}, a block`);
    }
  }
});

test("the Align: a shaper lag at the oversampling it waits for, 4x as the Drive's default", () => {
  assert.equal(value(planner.plan('Align'), 'lag', 'oversample'), '4x');
  assert.equal(value(planner.plan('Align', { values: { oversample: 'none' } }), 'lag', 'oversample'), 'none');
});

test('the Crusher: its bits and rate onto a crusher, mixed with the dry', () => {
  const plan = planner.plan('Crusher', { values: { bits: 10, rate: 16000, mix: 0.4 } });
  assert.equal(value(plan, 'crusher', 'bits'), 10);
  assert.equal(value(plan, 'crusher', 'rate'), 16000);
  assert.equal(value(plan, 'wet', 'gain'), 0.4);
});

test('the Chorus: three short free delay lines, each moved by one LFO a third of its turn after the last, spread across', () => {
  const plan = planner.plan('Chorus', { beat: 0.5, values: chorusValues({ rate: 0.9 }) });
  for (const line of ['line 1', 'line 2', 'line 3']) {
    assert.equal(value(plan, line, 'sync'), 0, `${line}: free`);
    const ms = value(plan, line, 'ms');
    assert.ok(ms >= 7 && ms <= 25, `${line}: ${ms} ms`);
  }
  assert.equal(value(plan, 'lfo', 'frequency'), 0.9);
  const [second, third] = chorusLags(0.9);
  near(second, 1000 / 0.9 / 3, '120 degrees late', 1e-9);
  near(third, (2 * 1000) / 0.9 / 3, '240 degrees late', 1e-9);
  assert.equal(value(plan, 'lag 2', 'ms'), second);
  assert.equal(value(plan, 'lag 3', 'ms'), third);
  assert.ok(value(plan, 'pan 1', 'pan') < 0 && value(plan, 'pan 3', 'pan') > 0 && value(plan, 'pan 2', 'pan') === 0);
  assert.equal(
    value(planner.plan('Chorus', { values: chorusValues({ rate: 0.9, depth: 0.002 }) }), 'depth 1', 'gain'),
    0.002,
  );
});

test('the Ducker: a gain the kicks dip, untouched at its default', () => {
  const plan = planner.plan('Ducker');
  assert.equal(value(plan, 'duck', 'gain'), 1);
  assert.equal(paramAt(plan, ['level']).value, 1);
});

test("the ducking from the kicks' times: down to what its depth leaves by its attack, back by its release, never jumping", () => {
  const events = duckEvents([10, 10.5], { depth: 0.3, attack: 0.006, release: 0.15 });
  assert.equal(events.length, 4);
  assert.deepEqual(
    events.map(([kind]) => kind),
    ['target', 'target', 'target', 'target'],
    'each a glide: no jump, however close the kicks',
  );
  const [down, up] = events;
  near(down[1], 0.7, 'what its depth leaves', 1e-9);
  assert.equal(down[2], 10);
  assert.equal(up[1], 1);
  near(up[2], 10.006, 'back from its attack', 1e-9);
  assert.ok(down[3] < up[3], 'down fast, back slower');
  assert.deepEqual(duckEvents([], { depth: 0.3, attack: 0.006, release: 0.15 }), []);
});

test('the Grains: mostly dry as they come, their freeze and smear onto the grains', () => {
  const plan = planner.plan('Grains', { values: { freeze: 1, spray: 0.1 } });
  assert.ok(paramAt(planner.plan('Grains'), ['mix']).value <= 0.25, 'subtle by default');
  assert.equal(value(plan, 'grains', 'freeze'), 1);
  assert.equal(value(plan, 'grains', 'spray'), 0.1);
});

test('the EQ at its defaults is flat: four bands in a row, every gain 1, the low cut at 10 Hz', () => {
  const plan = planner.plan('EQ');
  assert.deepEqual(childrenOf(plan), [
    ['low cut', 'eq band'],
    ['low', 'eq band'],
    ['mid', 'eq band'],
    ['high', 'eq band'],
  ]);
  for (const band of ['low cut', 'low', 'mid', 'high']) {
    assert.equal(value(plan, band, 'gain'), 1, band);
  }
  assert.equal(value(plan, 'low cut', 'frequency'), 10);
  assert.deepEqual(
    ['low cut', 'low', 'mid', 'high'].map((band) => value(plan, band, 'type')),
    ['highpass', 'low shelf', 'peak', 'high shelf'],
  );
  assert.deepEqual(
    ['low', 'mid', 'high'].map((band) => value(plan, band, 'frequency')),
    [100, 1000, 8000],
  );
  assert.equal(value(plan, 'mid', 'resonance'), 0.707);
});

test("each of the EQ's macros reaches its band, its three gains shown in dB and its frequencies in Hz by octaves", () => {
  const values = {
    'low cut': 250,
    low: 2,
    mid: 0.5,
    high: 4,
    'low frequency': 120,
    'mid frequency': 2500,
    'mid q': 3,
    'high frequency': 6000,
  };
  const plan = planner.plan('EQ', { values });
  assert.equal(value(plan, 'low cut', 'frequency'), 250);
  assert.deepEqual(
    ['low', 'mid', 'high'].map((band) => value(plan, band, 'gain')),
    [2, 0.5, 4],
  );
  assert.deepEqual(
    ['low', 'mid', 'high'].map((band) => value(plan, band, 'frequency')),
    [120, 2500, 6000],
  );
  assert.equal(value(plan, 'mid', 'resonance'), 3);
  for (const name of ['low', 'mid', 'high']) {
    assert.equal(paramAt(plan, [name]).spec.dB, true, `${name}: a share shown in dB`);
  }
  for (const name of ['low cut', 'low frequency', 'mid frequency', 'high frequency']) {
    const { spec } = paramAt(plan, [name]);
    assert.deepEqual([spec.unit, spec.taper], ['Hz', 'octaves'], name);
  }
  assert.equal(paramAt(plan, ['mid q']).spec.unit, undefined, 'mid q: no unit');
});

test('the Isolator at its defaults: crossovers at 200 and 2500 Hz, each band at 1; a split moves its own four filters and no other', () => {
  const plan = planner.plan('Isolator');
  for (const name of ['low 1', 'low 2', 'rest 1', 'rest 2']) {
    assert.equal(value(plan, name, 'frequency'), 200, name);
  }
  for (const name of ['mid 1', 'mid 2', 'high 1', 'high 2']) {
    assert.equal(value(plan, name, 'frequency'), 2500, name);
  }
  for (const name of ['low', 'mid', 'high', 'sum']) {
    assert.equal(value(plan, name, 'gain'), 1, name);
  }
  assert.deepEqual(
    ['low 1', 'low 2', 'mid 1', 'mid 2'].map((name) => settingValue(plan, name, 'type')),
    ['lowpass', 'lowpass', 'lowpass', 'lowpass'],
  );
  assert.deepEqual(
    ['rest 1', 'rest 2', 'high 1', 'high 2'].map((name) => settingValue(plan, name, 'type')),
    ['highpass', 'highpass', 'highpass', 'highpass'],
  );
  const moved = planner.plan('Isolator', {
    values: { 'low split': 300, 'high split': 4000, low: 0, mid: 0.5, high: 2 },
  });
  for (const name of ['low 1', 'low 2', 'rest 1', 'rest 2']) {
    assert.equal(value(moved, name, 'frequency'), 300, name);
  }
  for (const name of ['mid 1', 'mid 2', 'high 1', 'high 2']) {
    assert.equal(value(moved, name, 'frequency'), 4000, name);
  }
  assert.deepEqual(
    ['low', 'mid', 'high'].map((name) => value(moved, name, 'gain')),
    [0, 0.5, 2],
  );
  const lowOnly = planner.plan('Isolator', { values: { 'low split': 300 } });
  for (const name of ['mid 1', 'mid 2', 'high 1', 'high 2']) {
    assert.equal(value(lowOnly, name, 'frequency'), 2500, name);
  }
});

test('the Compressor at its defaults: threshold -18, knee 6, ratio 2, attack 0.02, release 0.2, nothing added after; its macros reach the block', () => {
  const names = ['threshold', 'knee', 'ratio', 'attack', 'release'];
  const plan = planner.plan('Compressor');
  assert.deepEqual(
    names.map((name) => value(plan, 'compressor', name)),
    [-18, 6, 2, 0.02, 0.2],
  );
  assert.equal(value(plan, 'makeup', 'gain'), 1);
  const set = planner.plan('Compressor', {
    values: { threshold: -12, knee: 0, ratio: 4, attack: 0.01, release: 0.1, makeup: 2 },
  });
  assert.deepEqual(
    names.map((name) => value(set, 'compressor', name)),
    [-12, 0, 4, 0.01, 0.1],
  );
  assert.equal(value(set, 'makeup', 'gain'), 2);
});

test("the Juno chorus: two free lines at 3.505 ms, the right's sweep the left's inverted, the input highpassed at 175 Hz, the wet lowpassed at 9 kHz", () => {
  const plan = planner.plan('JunoChorus');
  assert.equal(value(plan, 'depth left', 'gain'), 0.001845);
  assert.equal(value(plan, 'depth right', 'gain'), -0.001845);
  for (const line of ['line left', 'line right']) {
    assert.equal(value(plan, line, 'ms'), 3.505, `${line}: its center`);
    assert.equal(value(plan, line, 'sync'), 0, `${line}: free`);
  }
  assert.equal(value(plan, 'lfo', 'frequency'), 0.513);
  assert.equal(settingValue(plan, 'lfo', 'wave'), 'triangle');
  assert.equal(settingValue(plan, 'lows', 'type'), 'highpass');
  assert.equal(value(plan, 'lows', 'frequency'), 175);
  assert.equal(settingValue(plan, 'highs', 'type'), 'lowpass');
  assert.equal(value(plan, 'highs', 'frequency'), 9000);
  assert.equal(value(plan, 'pan left', 'pan'), -1);
  assert.equal(value(plan, 'pan right', 'pan'), 1);
  near(value(plan, 'wet', 'gain'), 0.416, "the wet 1.6 dB under the dry, half of 0.832 for a hard pan's sum", 1e-9);
  assert.equal(value(plan, 'dry', 'gain'), 1);
});

test("the Juno chorus's macros: depth into both lines' sweeps, one inverted; center into both lines; wet halved onto its gain; its two rates, I and II", () => {
  const plan = planner.plan('JunoChorus', {
    values: { depth: 0.001, center: 5, rate: JUNO_CHORUS.II, wet: 1, dry: 0.5 },
  });
  assert.equal(value(plan, 'depth left', 'gain'), 0.001);
  assert.equal(value(plan, 'depth right', 'gain'), -0.001);
  for (const line of ['line left', 'line right']) {
    assert.equal(value(plan, line, 'ms'), 5, line);
  }
  assert.equal(value(plan, 'lfo', 'frequency'), 0.863);
  assert.equal(value(plan, 'wet', 'gain'), 0.5);
  assert.equal(value(plan, 'dry', 'gain'), 0.5);
  assert.deepEqual(JUNO_CHORUS, { I: 0.513, II: 0.863 });
});

test("the tape echo: the line, a highpass at 100 Hz, a lowpass, a soft clip in the loop; the wow and the wobble into the line's time", () => {
  const plan = planner.plan('TapeEcho');
  assert.deepEqual(childrenOf(plan), [
    ['line', 'delay'],
    ['lows', 'filter'],
    ['lowpass', 'filter'],
    ['clip', 'shaper'],
    ['loop', 'gain'],
    ['wow', 'wow'],
    ['wow depth', 'gain'],
    ['wobble', 'oscillator'],
    ['depth', 'gain'],
  ]);
  assert.deepEqual(
    wiresOf(plan).sort(),
    [
      'in > line',
      'line > lows',
      'lows > lowpass',
      'lowpass > clip',
      'clip > out',
      'clip > loop',
      'loop > line',
      'wow > wow depth',
      'wow depth > line:ms',
      'wobble > depth',
      'depth > line:ms',
    ].sort(),
  );
  assert.deepEqual(
    ['oversample', 'drive', 'shape'].map((name) => value(plan, 'clip', name)),
    ['none', 2, 0],
  );
  assert.equal(settingValue(plan, 'lows', 'type'), 'highpass');
  assert.deepEqual(
    ['frequency', 'resonance'].map((name) => value(plan, 'lows', name)),
    [100, 0.707],
  );
  assert.equal(value(plan, 'lowpass', 'frequency'), 2400);
  assert.equal(value(plan, 'loop', 'gain'), 0.45);
  assert.equal(value(plan, 'wow depth', 'gain'), 0.0005);
  assert.equal(value(plan, 'wow', 'frequency'), 1);
  assert.equal(value(plan, 'depth', 'gain'), 0);
});

test("the tape echo's macros reach their blocks: feedback, tone, low cut, drive, wow, wow rate, rate, depth, its time; its time glides at TAPE_GLIDE", () => {
  const values = {
    feedback: 1.1,
    tone: 5000,
    'low cut': 200,
    drive: 4,
    wow: 0.002,
    'wow rate': 3,
    rate: 0.7,
    depth: 0.003,
    note: '1/8.',
    sync: 1,
    ms: 300,
  };
  const plan = planner.plan('TapeEcho', { values });
  assert.equal(value(plan, 'loop', 'gain'), 1.1);
  assert.equal(value(plan, 'lowpass', 'frequency'), 5000);
  assert.equal(value(plan, 'lows', 'frequency'), 200);
  assert.equal(value(plan, 'clip', 'drive'), 4);
  assert.equal(value(plan, 'wow depth', 'gain'), 0.002);
  assert.equal(value(plan, 'wow', 'frequency'), 3);
  assert.equal(value(plan, 'wobble', 'frequency'), 0.7);
  assert.equal(value(plan, 'depth', 'gain'), 0.003);
  assert.deepEqual(
    ['ms', 'note', 'sync'].map((name) => value(plan, 'line', name)),
    [300, '1/8.', 1],
  );
  assert.equal(TAPE_GLIDE, 0.3);
});

test('the hiss: two looping noise sources at offset 2, each through a pan pot, into a level, summed with the input passed on', () => {
  const plan = planner.plan('Hiss');
  assert.deepEqual(childrenOf(plan), [
    ['left', 'noise'],
    ['right', 'noise'],
    ['pan left', 'pan'],
    ['pan right', 'pan'],
    ['level', 'gain'],
    ['through', 'gain'],
    ['sum', 'gain'],
  ]);
  assert.deepEqual(
    wiresOf(plan).sort(),
    [
      'in > through',
      'through > sum',
      'left > pan left',
      'right > pan right',
      'pan left > level',
      'pan right > level',
      'level > sum',
      'sum > out',
    ].sort(),
  );
  for (const side of ['left', 'right']) {
    assert.equal(value(plan, side, 'offset'), 2, side);
    assert.equal(settingValue(plan, side, 'color'), 'noise', side);
    assert.equal(settingValue(plan, side, 'loop'), 'on', side);
  }
  assert.deepEqual(
    ['pan left', 'pan right'].map((pan) => value(plan, pan, 'pan')),
    [-1, 1],
  );
  for (const pan of ['pan left', 'pan right']) {
    assert.equal(settingValue(plan, pan, 'law'), 'pan pot', pan);
  }
  assert.deepEqual(
    ['level', 'through', 'sum'].map((name) => value(plan, name, 'gain')),
    [0.000548, 1, 1],
  );
  assert.equal(value(planner.plan('Hiss', { values: { level: 0.002 } }), 'level', 'gain'), 0.002);
});

test("the Room at its defaults: a decay of 1 s and a level of 1; the plate's and the room's values reach the block's params, the PCM-60's range of decay", () => {
  const plan = planner.plan('Room');
  assert.deepEqual(childrenOf(plan), [
    ['room', 'room'],
    ['level', 'gain'],
  ]);
  assert.equal(value(plan, 'room', 'decay'), 1);
  assert.equal(value(plan, 'level', 'gain'), 1);
  const plate = planner.plan('Room', { values: { ...PCM60.plate, decay: 2 } });
  assert.deepEqual(
    ['decay', 'taps', 'dense', 'high decay', 'pre delay', 'low decay'].map((name) => value(plate, 'room', name)),
    [2, 0, 0.01, 0.8, 0, 1],
  );
  const names = ['decay', 'pre delay', 'taps', 'dense', 'low decay', 'high decay'];
  const set = planner.plan('Room', {
    values: { decay: 3, 'pre delay': 0.05, taps: 4, dense: 0.02, 'low decay': 1.5, 'high decay': 0.25, level: 0.4 },
  });
  assert.deepEqual(
    names.map((name) => value(set, 'room', name)),
    [3, 0.05, 4, 0.02, 1.5, 0.25],
  );
  assert.equal(value(set, 'level', 'gain'), 0.4);
  const { room } = PCM60;
  assert.deepEqual(room, { 'pre delay': 0.02, taps: 8, dense: 0.08, 'low decay': 1, 'high decay': 0.5 });
  assert.deepEqual(PCM60_DECAY, [0.2, 4.5]);
});

test('the Lookahead limiter at its defaults: its one block, the gain 0, the ceiling -1, the release 0.3 and the clip 3; its macros each reach their param', () => {
  const names = ['gain', 'ceiling', 'release', 'clip'];
  const plan = planner.plan('Lookahead limiter');
  assert.deepEqual(childrenOf(plan), [['limiter', 'lookahead limiter']]);
  assert.deepEqual(
    names.map((name) => value(plan, 'limiter', name)),
    [0, -1, 0.3, 3],
  );
  const set = planner.plan('Lookahead limiter', { values: { gain: 6, ceiling: -3, release: 0.5, clip: 6 } });
  assert.deepEqual(
    names.map((name) => value(set, 'limiter', name)),
    [6, -3, 0.5, 6],
  );
});

// The synth's unit tests (mockup/src/libs/synth, its test/ folder since W4): what the recordings don't show, on patches written by hand:
// note values for times and an LFO's rate, a note's conditions, envelopes as blocks cabled to what they move. Those on every theme's
// patches went with the patches (LAY15b), the themes' instruments their voice cards since
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountSpec,
  envelopeEvents,
  mappingOf,
  paramOf,
  plan,
  termOf,
  adsr,
  perc,
  stage,
  swell,
  time,
  val,
} from '../index.ts';
import { mtof } from '../../music-theory/index.ts';
import { near } from '../../util/test/near.js';

// a note and its context, as plan() takes them: the note's own values, and the tempo and the random source beside it. A value given as
// undefined stays so (a note value with no beat)
const played = (more = {}) => {
  const { beat, random, ...note } = { beat: 0.8, random: () => 0.5, ...more };
  return [
    { pitch: 69, velocity: 1, duration: 1, ...note },
    { beat, random },
  ];
};

const stopOf = (p, block) => p.nodes.find((n) => n.block === block && n.stops.length).stops[0][0];

test('a time can be a note value: 1/4 a beat, dotted half as long again, a triplet two-thirds; also in a sum', () => {
  const patch = (v) => ({ oscs: [{ wave: 'sine', stop: v }] });
  for (const [v, beats] of [
    ['1/4', 1],
    ['1/8', 0.5],
    ['1/16', 0.25],
    ['1/2', 2],
    ['1/4.', 1.5],
    ['1/8.', 0.75],
    ['1/8t', 1 / 3],
    ['1/4t', 2 / 3],
    ['3/8', 1.5],
  ]) {
    near(stopOf(plan(patch(v), ...played()), 'osc 1'), beats * 0.8, `${v}:`);
  }
  near(stopOf(plan(patch('1/8 + 0.05'), ...played()), 'osc 1'), 0.45, '1/8 + 0.05:');
  near(stopOf(plan(patch('2 duration + 1/4'), ...played({ duration: 0.5 })), 'osc 1'), 1.8, '2 duration + 1/4:');
  assert.throws(() => plan(patch('1/8'), ...played({ beat: undefined })), /no beat/, 'a note value needs the beat');
});

test("an LFO's rate can be a note value: one turn in that time, so it follows the tempo", () => {
  const lfo = (rate) =>
    plan({ oscs: [{ wave: 'sine' }], lfos: [{ rate, depth: 10, target: 'osc 1.detune' }] }, ...played()).nodes.find(
      (n) => n.block === 'lfo 1' && n.node === 'oscillator',
    );
  near(lfo('1/4').params.frequency[0][1], 1 / 0.8, '1/4 at a beat of 0.8 s:');
  near(lfo('1/8t').params.frequency[0][1], 3 / 0.8, '1/8t:');
  near(lfo(5).params.frequency[0][1], 5, 'hertz stay hertz:');
});

test("a delay's time with a sync switch: synced, its note at the beat, glided to a new beat; free, its ms, a new beat leaving it; each a value or a param it names", () => {
  const [, context] = played(); // a beat of 0.8 s
  const delay = (time) => ({
    effect: true,
    chain: ['delay'],
    delay: { feedback: 0.4, tone: 2000, ...time },
    handle: { tempo: { tc: 0.3 } },
  });
  const timeOf = (p) => p.nodes.find((n) => n.node === 'delay').params.delayTime[0][1];
  const synced = plan(delay({ sync: 1, note: '1/8.', ms: 300 }), {}, context);
  near(timeOf(synced), 0.6, 'a dotted 8th at the beat');
  assert.deepEqual(synced.handle.tempo(1, 2)[0].events, [['target', 0.75, 2, 0.3]], 'a new beat: glided there');
  const free = plan(delay({ sync: 0, note: '1/8.', ms: 300 }), {}, context);
  near(timeOf(free), 0.3, '300 ms');
  assert.equal(free.handle?.tempo, undefined, 'a new beat leaves it');
  const named = plan(delay({ sync: 'sync', note: 'note', ms: 'ms' }), {}, context, { sync: 1, note: '1/4', ms: 300 });
  near(timeOf(named), 0.8, 'each a param it names');
  assert.throws(() => plan(delay({ sync: 1, note: '1/8', ms: 300 }), {}, { ...context, beat: undefined }), /no beat/);
});

test('a value, or a whole block, can depend on the note', () => {
  const patch = {
    oscs: [
      { wave: 'sine', level: { if: 'vibrato > 12', then: 0.1, else: 0.06 } },
      { wave: 'sine', when: 'held && duration > 0.6' },
    ],
  };
  const level = (n) =>
    plan(patch, ...played(n)).nodes.find((x) => x.block === 'osc 1' && x.node === 'gain').params.gain[0][1];
  near(level({ vibrato: 16 }), 0.1);
  near(level({ vibrato: 8 }), 0.06);
  const oscs = (n) => plan(patch, ...played(n)).nodes.filter((x) => x.node === 'oscillator').length;
  assert.equal(oscs({ held: true, duration: 1 }), 2);
  assert.equal(oscs({ held: true, duration: 0.4 }), 1);
  assert.equal(oscs({ held: false, duration: 1 }), 1);
});

test("a noise block's buffer named by its length, 2 s of noise or a 0.2 s breath, the engine making any length (W2b)", () => {
  const bufferOf = (more) =>
    plan(
      { noise: [{ filter: { type: 'bandpass', freq: 1000 }, ...more }] },
      { pitch: 60, velocity: 1 },
      { random: () => 0.5 },
    ).nodes.find((node) => node.node === 'buffer').props.buffer;
  assert.deepEqual(bufferOf({}), { noise: 2 }, 'noise, by default');
  assert.deepEqual(bufferOf({ buffer: 'noise' }), { noise: 2 });
  assert.deepEqual(bufferOf({ buffer: 'breath' }), { noise: 0.2 });
});

test("an envelope cabled to a port of many moves them all: a drop in pitch on every osc's detune", () => {
  const p = plan(
    {
      oscs: [{ wave: 'sine' }, { wave: 'triangle', ratio: 2 }],
      envelopes: [{ target: 'oscs.detune', amount: -50, decay: 0.2, sustain: 0 }],
    },
    ...played(),
  );
  const oscs = p.nodes.filter((n) => n.node === 'oscillator');
  assert.equal(oscs.length, 2);
  for (const o of oscs) {
    assert.deepEqual(o.params.detune, [
      ['set', -50, 0],
      ['linear', 0, 0.2],
    ]);
  }
  assert.throws(
    () => plan({ oscs: [{ wave: 'sine' }], envelopes: [{ target: 'vca.gain', ...perc(0, 1) }] }, ...played()),
    /no block offers: vca.gain/,
    'cabled to a port no block offers',
  );
});

// a patch with an envelope cabled to a gain, the tremolo's; and what it automates there
const cabled = (envelope, more = {}) => ({
  oscs: [{ stop: 3 }],
  tremolo: true,
  envelopes: [{ ...envelope, target: 'tremolo.gain' }],
  ...more,
});

const automated = (envelope, n, more) =>
  plan(cabled(envelope, more), ...n, { decay: 1.4 }).nodes.find((o) => o.block === 'tremolo').params.gain;

test("the presets as automation, value for value (I1h2): an envelope's shape, a share of the gain's level times the note's velocity, its attack straight, its decay and release exponential; released from where it is at the note's end", () => {
  const n = played({ velocity: 0.8, duration: 0.9, held: true, rise: 0.4 });
  const full = 0.8; // its amount, the gain's full level, times the velocity
  assert.deepEqual(automated(perc(0.005, 'decay'), n), [
    ['set', 0.0001, 0],
    ['linear', full, 0.005],
    ['exp', 0.0001, 0.005 + 1.4],
  ]);
  assert.deepEqual(automated(adsr({ attack: 0.045, decay: 0.45, sustain: 0.6, release: 0.45 }), n), [
    ['set', 0.0001, 0],
    ['linear', full, 0.045],
    ['exp', full * 0.6, 0.045 + 0.45],
    ['set', full * 0.6, 0.9],
    ['exp', 0.0001, 0.9 + 0.45],
  ]);
  assert.deepEqual(
    automated(adsr({ attack: 0.012, decay: 0.5, sustain: 0.25, release: 0.3 }), n),
    [
      ['set', 0.0001, 0],
      ['linear', full, 0.012],
      ['exp', full * 0.25, 0.012 + 0.5],
      ['set', full * 0.25, 0.9],
      ['exp', 0.0001, 0.9 + 0.3],
    ],
    "a pluck: its decay a time of its own, not the note's length",
  );
  assert.deepEqual(
    automated(swell({ delay: 'rise', attack: '6 rise', velocity: false }), n),
    [
      ['set', 0.0001, 0],
      ['set', 0.0001, 0.4],
      ['linear', 1, 0.4 + 6 * 0.4],
    ],
    'its full level at any velocity, after its delay (I1h2a)',
  );
  assert.deepEqual(
    automated(swell({ delay: 0.3, attack: 6 }), n, { note: { continuous: true } }),
    [
      ['value', 0.0001],
      ['set', 0.0001, 0.3],
      ['linear', 1, 0.3 + 6],
    ],
    'a sound that runs on starts from its value, its velocity 1',
  );
  assert.deepEqual(
    automated(stage(2), n),
    [
      ['set', 0.0001, 0],
      ['set', 0.0001, 2 * 0.4],
      ['linear', 1, 2 * 0.4 + 1.5 * 0.4],
    ],
    'joining at its stage, not before, its level at any velocity',
  );
  assert.deepEqual(
    automated(stage(2), played({ rise: 0.06 })),
    [
      ['set', 0.0001, 0],
      ['set', 0.0001, 2 * 0.06],
      ['linear', 1, 2 * 0.06 + 0.15],
    ],
    'its attack 0.15 s at least',
  );
  assert.deepEqual(automated(stage(0), n), [['set', 1, 0]], 'from the start');
  assert.deepEqual(
    automated({ attack: 0.1, hold: 0.2, sustain: 0.3 }, n),
    [
      ['set', 0.0001, 0],
      ['linear', full, 0.1],
      ['set', full * 0.3, 0.1 + 0.2],
    ],
    'a line, a hold, a step',
  );
  const tap = plan(
    { oscs: [{ level: 0.26, stop: 3 }], envelopes: [{ target: 'osc 1.gain', ...perc(0.005, 'decay') }] },
    ...n,
    { decay: 1.4 },
  );
  assert.deepEqual(
    tap.nodes.find((o) => o.block === 'osc 1' && o.node === 'gain').params.gain,
    [
      ['set', 0.0001, 0],
      ['linear', 0.26 * full, 0.005],
      ['exp', 0.0001, 0.005 + 1.4],
    ],
    "an osc's level its full scale, in its one gain; silence the floor of what comes out",
  );
});

test('the presets give envelopes as their shapes (I1h2): perc, adsr, swell, a stage', () => {
  assert.deepEqual(perc(0.005, 'decay'), { attack: 0.005, decay: 'decay', sustain: 0 });
  assert.deepEqual(
    adsr({ attack: 0.045, decay: 0.45, sustain: 0.6, release: 0.45 }),
    { attack: 0.045, decay: 0.45, sustain: 0.6, release: 0.45 },
    'its sustain held until the note-off, its release from there',
  );
  assert.deepEqual(swell({ delay: 'rise', attack: '6 rise', velocity: false }), {
    velocity: false,
    delay: 'rise',
    attack: '6 rise',
  });
  assert.deepEqual(swell({ attack: 0.75, release: '1.7 release' }), { attack: 0.75, release: '1.7 release' });
  assert.deepEqual(stage(2), { velocity: false, delay: '2 rise', attack: '1.5 rise in 0.15..' });
  assert.deepEqual(stage(0), { velocity: false }, 'at its level from the start');
});

test("an envelope apart from what it moves: an osc builds its level's gain for one, its level the envelope's full scale; a scoop from the note's bend", () => {
  const apart = {
    oscs: [{ wave: 'sawtooth', level: 0.2, stop: 1 }],
    envelopes: [
      { target: 'osc 1.gain', ...perc(0.01, 0.5) },
      {
        target: 'osc 1.frequency',
        amount: { if: 'pitchBend', then: 'pitchBend', else: -0.6 },
        decay: { if: 'pitchBend', then: 0.14, else: 0.07 },
        sustain: 0,
      },
    ],
  };
  const f = mtof(69);
  const of = (p, kind) => p.nodes.find((o) => o.block === 'osc 1' && o.node === kind);
  const straight = plan(apart, ...played());
  assert.deepEqual(
    of(straight, 'gain').params.gain,
    [
      ['set', 0.0001, 0],
      ['linear', 0.2, 0.01],
      ['exp', 0.0001, 0.01 + 0.5],
    ],
    "its level, the envelope's alone",
  );
  assert.deepEqual(of(straight, 'oscillator').params.frequency, [
    ['value', f],
    ['set', f * Math.pow(2, (-0.6 * 1) / 12), 0],
    ['exp', f, 0.07],
  ]);
  const bent = plan(apart, ...played({ pitchBend: -2 }));
  assert.deepEqual(
    of(bent, 'oscillator').params.frequency,
    [
      ['value', f],
      ['set', f * Math.pow(2, (-2 * 1) / 12), 0],
      ['exp', f, 0.14],
    ],
    'sliding in from its bend',
  );
  const unreadable = { oscs: [{}], envelopes: [{ target: 'osc 1.gain', amount: '2 loud' }] };
  assert.throws(() => plan(unreadable, ...played()), /can't read: 2 loud/);
});

test('the VCA: a gain its envelope moves, then its level, a gain of its own, a port; its silence below its level, so what comes out starts at the floor', () => {
  const n = played({ velocity: 0.7 });
  const p = plan(
    { vca: { level: 0.2 }, oscs: [{ stop: 2 }], envelopes: [{ target: 'vca.gain', ...perc(0.03, 'duration') }] },
    ...n,
  );
  const [moved, level] = p.nodes.filter((o) => o.block === 'vca');
  assert.deepEqual(moved.params.gain, [
    ['set', 0.0001 / 0.2, 0],
    ['linear', 0.7, 0.03],
    ['exp', 0.0001 / 0.2, 0.03 + 1],
  ]);
  assert.deepEqual(level.params.gain, [['value', 0.2]]);
  assert.ok(
    p.edges.some(([from, to]) => from === moved.id && to === level.id),
    "its envelope's gain into its level",
  );
  assert.deepEqual(p.controls.set('vca.level', 0.1, 1, 0), [
    { id: level.id, param: 'gain', events: [['set', 0.1, 1]] },
  ]);
  const open = plan({ vca: { level: 0.5 }, oscs: [{ stop: 2 }] }, ...n).nodes.filter((o) => o.block === 'vca');
  assert.deepEqual(
    open.map((o) => o.params),
    [{}, { gain: [['value', 0.5]] }],
    'with no envelope, open, at its level',
  );
});

test("a time held between two for any value, at least so much where it has no top: a drone's harmonic's attack", () => {
  const values = (more) => ({ random: () => 0.5, ...more });
  assert.equal(time('1.5 rise in 0.15..', values({ rise: 0.06 })), 0.15, 'at least 0.15 s');
  assert.equal(time('1.5 rise in 0.15..', values({ rise: 0.4 })), 1.5 * 0.4, 'one and a half rises');
  assert.equal(time('duration in 0.1..0.5', values({ duration: 0.9 })), 0.5, "the note's duration, as before");
  assert.throws(() => time('0.5 nothing in 0.05..', values({})), /can't read/);
});

test('a time by a named value read as a value is, its mapping: a name with capitals too, as a macro or a note value has it (DRY3)', () => {
  const values = { random: () => 0.5, pitchBend: 0.25, beat: 0.5 };
  assert.equal(time('2 pitchBend', values), 0.5, 'its factor times it');
  assert.equal(time('2 pitchBend in 0.6..', values), 0.6, 'held in its range');
  assert.equal(time('1/8 + 2 pitchBend', values), 0.75, 'beside a note value, summed');
});

test('a term read as its mapping, as a macro is mapped to a knob: one source by name, its factor, its range, its offset; else none', () => {
  assert.deepEqual(mappingOf('decay'), { source: 'decay', factor: 1, offset: 0 }, 'a macro by its name');
  assert.deepEqual(mappingOf('0.35 decay'), { source: 'decay', factor: 0.35, offset: 0 }, 'a share of it');
  assert.deepEqual(mappingOf('0.4 decay + 0.05'), { source: 'decay', factor: 0.4, offset: 0.05 }, 'and so much after');
  assert.deepEqual(
    mappingOf('1.5 rise in 0.15..'),
    { source: 'rise', factor: 1.5, offset: 0, low: 0.15 },
    'held at least so much',
  );
  assert.deepEqual(
    mappingOf('duration in 0.1..0.5'),
    { source: 'duration', factor: 1, offset: 0, low: 0.1, high: 0.5 },
    'held between two',
  );
  assert.deepEqual(mappingOf('pitchBend'), { source: 'pitchBend', factor: 1, offset: 0 }, "a note's value by its name");
  for (const written of ['1/8', '1/8 + 0.05', 'duration + rise', '0.5', 'decay +', '']) {
    assert.equal(mappingOf(written), null, `${written}: a note value, two sources or seconds only aren't one mapping`);
  }
});

test("a value by name read with a factor, held within its range, plus its offset, as a time is (I1i2): an LFO's depth, an envelope's amount", () => {
  const values = { vibrato: 16, pitchBend: -2, random: () => 0.5 };
  assert.equal(val('0.5 vibrato', values), 8, 'half the vibrato');
  assert.equal(val('vibrato in 0..10 + 1', values), 11, 'at most 10, and 1 after');
  assert.equal(val('sine', values), 'sine', 'a word that names no value stays itself: a wave');
  const depth = plan(
    { oscs: [{}], lfos: [{ rate: 5, depth: '0.5 vibrato', target: 'osc 1.detune' }] },
    ...played({ vibrato: 16 }),
  ).nodes.find((n) => n.block === 'lfo 1' && n.node === 'gain');
  assert.deepEqual(depth.params.gain, [['value', 8]], "an LFO's depth, half the note's vibrato");
  const scoop = envelopeEvents(
    { oscs: [{}], envelopes: [{ target: 'osc 1.frequency', amount: '0.5 pitchBend', decay: 0.1, sustain: 0 }] },
    0,
    ...played({ pitchBend: -2 }),
  );
  near(scoop.automation[0][1], Math.pow(2, -1 / 12), "a scoop from half the note's bend:");
});

test("a mapping written back as a term: a factor of 1 left out, its range and offset only where it has them, a float's tail left off", () => {
  assert.equal(termOf({ source: 'decay', factor: 1, offset: 0 }), 'decay');
  assert.equal(termOf({ source: 'decay', factor: 0.4, offset: 0.05 }), '0.4 decay + 0.05');
  assert.equal(termOf({ source: 'rise', factor: 1.5, offset: 0, low: 0.15 }), '1.5 rise in 0.15..');
  assert.equal(termOf({ source: 'duration', factor: 1, offset: 0, low: 0.1, high: 0.5 }), 'duration in 0.1..0.5');
  assert.equal(
    termOf({ source: 'decay', factor: 0.1 + 0.2, offset: 0 }),
    '0.3 decay',
    "a slider's step, 0.30000000000000004",
  );
});

// the inserts' blocks (F1b, mockup/architecture/mixer-and-fx.md, "Inserts as FX modules"): each a stage of an FX module, as data; how
// Web Audio does it is the engine's (engine.test.js)
test('a gain: a stage any chain can list, built whenever one does, at 1 too, its gain a port; a Utility a gain and a pan', () => {
  const p = plan({ effect: true, chain: ['gain', 'pan'], gain: 1, pan: 0 }, ...played());
  const gain = p.nodes.find((n) => n.block === 'gain');
  const pan = p.nodes.find((n) => n.block === 'pan');
  assert.equal(gain.node, 'gain');
  assert.deepEqual(gain.params.gain, [['value', 1]], 'at 1, still a gain: what sets it later has one');
  assert.equal(p.input, gain.id, 'the module comes in at its gain');
  assert.deepEqual(
    p.edges.filter(([from]) => from === gain.id || from === pan.id),
    [
      [gain.id, pan.id],
      [pan.id, 'out'],
    ],
    'its gain into its pan, its pan out',
  );
  assert.deepEqual(p.ports['gain.gain'], [{ id: gain.id, param: 'gain' }]);
});

test("a filter's resonance can be a param, as its cutoff can: the Filter module's, 0.5 a tower's dullness", () => {
  const p = plan(
    {
      effect: true,
      chain: ['filter'],
      filter: { type: 'lowpass', q: 'q', freq: 'cutoff' },
      params: { q: 0.707, cutoff: 24000 },
    },
    {},
    { beat: 0.8, random: () => 0.5 },
    { q: 0.5 },
  );
  const filter = p.nodes.find((n) => n.block === 'filter');
  assert.deepEqual(filter.params.Q, [['value', 0.5]], 'its Q from the params');
  assert.deepEqual(filter.params.frequency, [['value', 24000]], 'its cutoff the default');
});

test("a filter's slope, 12 or 24 dB an octave: at 24 two biquads in series, flat at a resonance of 0.707, its cutoff on both, an LFO moving both; a noise's own too; a slope a param names", () => {
  const biquads = (p) => p.nodes.filter((n) => n.node === 'biquad');
  const planned = (filter, more = {}) =>
    plan({ oscs: [{ wave: 'sine' }], chain: ['filter'], filter, ...more }, ...played());
  assert.equal(biquads(planned({ type: 'lowpass', freq: 800 })).length, 1, 'at 12, one');
  const p = planned({ type: 'lowpass', freq: 800, q: Math.SQRT1_2, slope: '24' });
  const [first, second] = biquads(p);
  near(first.params.Q[0][1], 0.5412, 'flat: the first', 1e-4);
  near(second.params.Q[0][1], 1.3066, 'flat: the second', 1e-4);
  assert.deepEqual([first.params.frequency, second.params.frequency], [[['value', 800]], [['value', 800]]]);
  assert.deepEqual(
    p.edges.filter(([from]) => from === first.id).map(([, to]) => to),
    [second.id],
    'in series: the first only into the second',
  );
  const lfo = planned(
    { type: 'lowpass', freq: 800, slope: '24' },
    { lfos: [{ rate: 0.1, depth: 100, target: 'filter.frequency', free: true }] },
  );
  const moved = biquads(lfo).map((b) =>
    lfo.edges.some(([, to]) => Array.isArray(to) && to[0] === b.id && to[1] === 'frequency'),
  );
  assert.deepEqual(moved, [true, true], 'its cutoff moved on both');
  const noisy = plan(
    { noise: [{ filter: { type: 'bandpass', freq: 1000, q: 2, slope: '24' }, level: 0.1, into: 'out' }] },
    ...played(),
  );
  assert.deepEqual(
    biquads(noisy).map((b) => b.params.Q),
    [[['value', 2]], [['value', 2]]],
    "a noise's own: a bandpass's both at its resonance",
  );
  const [noiseFirst, noiseLast] = biquads(noisy);
  assert.deepEqual(
    noisy.edges.filter(([from]) => from === noiseFirst.id).map(([, to]) => to),
    [noiseLast.id],
    "a noise's own in series too, its level after the last",
  );
  const named = plan(
    {
      effect: true,
      chain: ['filter'],
      filter: { type: 'lowpass', q: 'q', freq: 'cutoff', slope: 'slope' },
      params: { q: 0.707, cutoff: 24000, slope: '12' },
    },
    {},
    { beat: 0.8, random: () => 0.5 },
    { slope: '24' },
  );
  assert.equal(biquads(named).length, 2, 'a slope a param names');
  assert.equal(paramOf(['filter', 'q']).taper, 'octaves', 'its resonance by octaves, as the filter block declares it');
});

test("a control set with no glide jumps at its time, as Web Audio's setValueAtTime: a tower's cutoff at a phrase's first note", () => {
  const p = plan({ effect: true, chain: ['gain'], gain: 1 }, {}, { beat: 0.8, random: () => 0.5 });
  const gain = p.nodes.find((n) => n.block === 'gain');
  assert.deepEqual(p.controls.set('gain.gain', 0.5, 2, 0), [{ id: gain.id, param: 'gain', events: [['set', 0.5, 2]] }]);
});

test('a pan: a stage that pans, its position a port; centred, still a pan, so what sets it later has one', () => {
  const p = plan({ effect: true, chain: ['pan'], pan: -0.5 }, ...played());
  const pan = p.nodes.find((n) => n.block === 'pan');
  assert.equal(pan.node, 'panner');
  assert.deepEqual(pan.params.pan, [['value', -0.5]]);
  assert.equal(p.input, pan.id, 'the module comes in at it');
  assert.ok(
    p.edges.some(([from, to]) => from === pan.id && to === 'out'),
    'and goes out from it',
  );
  assert.deepEqual(p.ports.pan, [{ id: pan.id, param: undefined }]);
  assert.deepEqual(p.ports['pan.pan'], [{ id: pan.id, param: 'pan' }]);
  const centred = plan({ effect: true, chain: ['pan'], pan: 0 }, ...played());
  assert.deepEqual(centred.nodes.find((n) => n.block === 'pan').params.pan, [['value', 0]]);
});

test("a pan written with how it pans a mono sound: a pan pot, the engine told so, its position a param's; written as a position, up-mixed", () => {
  const p = plan(
    { effect: true, chain: ['pan'], pan: { position: 'pan', mono: 'pan pot' }, params: { pan: -0.4 } },
    ...played(),
  );
  const pan = p.nodes.find((n) => n.block === 'pan');
  assert.deepEqual(pan.props, { mono: 'pan pot' });
  assert.deepEqual(pan.params.pan, [['value', -0.4]]);
  assert.deepEqual(p.ports['pan.pan'], [{ id: pan.id, param: 'pan' }]);
  const upMixed = plan({ effect: true, chain: ['pan'], pan: -0.4 }, ...played());
  assert.deepEqual(upMixed.nodes.find((n) => n.block === 'pan').props, {}, 'as the mixer pans: nothing to tell');
});

test("a limiter: one node, its gain into it in dB, its ceiling in dBFS and its release in s, each a port; how it holds there is the engine's", () => {
  const p = plan({ effect: true, chain: ['limiter'], limiter: { gain: 16, ceiling: -0.3, release: 0.3 } }, ...played());
  const limiter = p.nodes.find((n) => n.block === 'limiter');
  assert.equal(limiter.node, 'limiter');
  assert.deepEqual(limiter.params, {
    gain: [['value', 16]],
    ceiling: [['value', -0.3]],
    release: [['value', 0.3]],
  });
  assert.equal(p.input, limiter.id, 'the module comes in at it');
  assert.ok(
    p.edges.some(([from, to]) => from === limiter.id && to === 'out'),
    'and goes out from it',
  );
  assert.deepEqual(p.ports.limiter, [{ id: limiter.id, param: undefined }]);
  for (const param of ['gain', 'ceiling', 'release']) {
    assert.deepEqual(p.ports[`limiter.${param}`], [{ id: limiter.id, param }]);
  }
  assert.deepEqual(p.controls.set('limiter.gain', 10, 0.5), [
    { id: limiter.id, param: 'gain', events: [['target', 10, 0.5, 0.05]] },
  ]);
});

// G0c2 (mockup/architecture/done.md): a note with a length stops what it sounds once its release has faded, as one let go does, so a patch
// need not write a stop from the note's length; since G0.3, once what gates it has faded, a struck one too
test('a note with a length: a source with no stop written stops once what gates it has faded, its release at its end; one with a stop keeps it; a struck one once its decay has (G0c2, G0.3)', () => {
  const patch = {
    vca: { level: 1 },
    oscs: [
      { wave: 'sine', ratio: 1 },
      { wave: 'sine', ratio: 2, stop: 0.2 },
    ],
    envelopes: [
      { target: 'vca.gain', ...adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 }) },
      { target: 'osc 2.gain', amount: 1, decay: 0.1, sustain: 0, release: 0.6 },
    ],
  };
  const oscStops = (p) => p.nodes.filter((n) => n.node === 'oscillator').map((n) => n.stops.map(([at]) => at));
  assert.deepEqual(
    oscStops(plan(patch, ...played({ duration: 1 }))),
    [[1 + 0.3], [0.2]],
    "the VCA's release, which gates it (its last release, osc 2's, until G0.3)",
  );
  assert.deepEqual(
    oscStops(plan(patch, ...played({ duration: undefined }))),
    [[], [0.2]],
    'held: stopped as it is let go',
  );
  const struck = { ...patch, envelopes: [{ target: 'vca.gain', ...perc(0.01, 0.4) }] };
  assert.deepEqual(
    oscStops(plan(struck, ...played({ duration: 1 }))),
    [[0.01 + 0.4], [0.2]],
    'no release: once its decay has faded (it rang on until G0.3)',
  );
});

// G0i2: a patch's longest clamps only a note planned with a length; a held note has none to clamp, and sounds until it's let go
test("a patch's longest clamps a note planned with a length; a held note, with none, sounds until it's let go (G0i2)", () => {
  const patch = {
    note: { longest: 1 },
    vca: { level: 1 },
    oscs: [{ wave: 'sine', ratio: 1 }],
    envelopes: [{ target: 'vca.gain', ...adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 }) }],
  };
  const oscStops = (p) => p.nodes.filter((n) => n.node === 'oscillator').map((n) => n.stops.map(([at]) => at));
  assert.deepEqual(
    oscStops(plan(patch, ...played({ duration: 3 }))),
    [[1 + 0.3]],
    'a length of 3 s played for its longest',
  );
  const held = plan(patch, ...played({ duration: undefined }));
  assert.deepEqual(oscStops(held), [[]], 'held: stopped as it is let go');
  const stops = held.controls.release(0.5).filter((op) => op.stop !== undefined);
  assert.deepEqual(
    stops.map((op) => op.stop),
    [0.5 + 0.3],
    'let go at 0.5 s, stopped once its release has faded',
  );
});

// G0i2: a note let go ends as one planned with a length does (G0c2): a source with no stop written stops once its last release has faded,
// one with a stop keeps it, never run on past it
test('a held note let go: a source with no stop written stops once its last release has faded; one with a stop keeps it (G0i2)', () => {
  const patch = {
    vca: { level: 1 },
    oscs: [{ wave: 'sine', ratio: 1 }],
    noise: [{ filter: { type: 'lowpass', freq: 400 }, level: 0.1, into: 'out', stop: 0.08 }],
    envelopes: [
      { target: 'vca.gain', ...adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 }) },
      { target: 'noise 1.gain', ...perc(0.003, 0.04) },
    ],
  };
  const held = plan(patch, ...played({ duration: undefined }));
  const sources = held.nodes.filter((n) => n.starts.length);
  const stopsOf = (ops) =>
    sources.map((n) => ops.filter((op) => op.id === n.id && op.stop !== undefined).map((op) => op.stop));
  assert.deepEqual(
    stopsOf(held.controls.release(0.5)),
    [[0.5 + 0.3], []],
    'the osc once faded; the noise at its own 0.08',
  );
});

// G0.3 (mockup/architecture/done.md): no stop written: a source stops once whatever gates it has faded, its own gain's envelope where
// that fades to nothing, else what it feeds, the VCA; an FM modulator and an LFO with the sound they move; at the envelope's end, where it
// reaches silence
test('no stop written: a source stops once whatever gates it has faded, at its end; an FM modulator and an LFO with the sound they move (G0.3)', () => {
  const patch = {
    vca: { level: 1 },
    oscs: [
      { wave: 'sine', ratio: 1 }, // its own envelope
      { wave: 'triangle', ratio: 2 }, // the VCA's alone
    ],
    fm: [{ carrier: 1, ratio: 2, index: 0.5 }],
    lfos: [{ rate: 5, depth: 3, target: 'osc 2.detune' }],
    noise: [{ filter: { type: 'lowpass', freq: 400 }, level: 0.1, into: 'out' }],
    envelopes: [
      { target: 'osc 1.gain', ...perc(0.01, 0.5) },
      { target: 'vca.gain', ...perc(0.02, 1.2) },
      { target: 'fm 1.gain', amount: 1, decay: 0.3, sustain: 0 }, // its index back to rest, not to silence
      { target: 'noise 1.gain', ...perc(0.003, 0.05) },
    ],
  };
  const stops = (p) =>
    Object.fromEntries(
      ['osc 1', 'osc 2', 'fm 1', 'lfo 1', 'noise 1'].map((block) => [
        block,
        p.nodes.filter((n) => n.block === block && n.starts.length).flatMap((n) => n.stops.map(([at]) => at)),
      ]),
    );
  assert.deepEqual(
    stops(plan(patch, ...played({ duration: undefined }))),
    {
      'osc 1': [0.01 + 0.5],
      'osc 2': [0.02 + 1.2],
      'fm 1': [0.01 + 0.5],
      'lfo 1': [0.02 + 1.2],
      'noise 1': [0.003 + 0.05],
    },
    'each where what gates it has faded',
  );
  const sustained = {
    ...patch,
    envelopes: [
      patch.envelopes[0],
      { target: 'vca.gain', ...adsr({ attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3 }) },
    ],
  };
  assert.deepEqual(
    stops(plan(sustained, ...played({ duration: undefined }))),
    { 'osc 1': [0.01 + 0.5], 'osc 2': [], 'fm 1': [0.01 + 0.5], 'lfo 1': [], 'noise 1': [] },
    'held at its sustain, what the VCA alone gates sounds on until it is let go; a noise with no envelope, into out, too',
  );
  assert.deepEqual(
    stops(plan(sustained, ...played({ duration: 1 }))),
    { 'osc 1': [0.01 + 0.5], 'osc 2': [1 + 0.3], 'fm 1': [0.01 + 0.5], 'lfo 1': [1 + 0.3], 'noise 1': [] },
    'with a length, released at its end: once its release has faded',
  );
});

// G0.3: let go, each source stops where whatever gates it fades now: a gate already silent stays closed where it was, one the release takes
// over closes once its release has faded, a source no envelope gates once the last release has, as the voice ends
test("let go: each source stops where what gates it fades now, a pluck's moved on to its release's end, one already silent left alone, one ungated with the voice (G0.3)", () => {
  const patch = {
    vca: { level: 1 },
    oscs: [
      { wave: 'sine', ratio: 1 }, // the VCA's, a pluck with a release
      { wave: 'sine', ratio: 2 }, // its own short envelope too
    ],
    noise: [{ filter: { type: 'lowpass', freq: 400 }, level: 0.1, into: 'out' }], // no envelope, past the VCA
    envelopes: [
      { target: 'vca.gain', ...perc(0.03, 0.9), release: 0.15 },
      { target: 'osc 2.gain', ...perc(0.01, 0.2) },
    ],
  };
  const held = plan(patch, ...played({ duration: undefined }));
  const sources = held.nodes.filter((n) => n.starts.length);
  assert.deepEqual(
    sources.map((n) => n.stops.map(([at]) => at)),
    [[0.03 + 0.9], [0.01 + 0.2], []],
    'held: where each would fade',
  );
  const ops = held.controls.release(0.9);
  assert.deepEqual(
    sources.map((n) => ops.filter((op) => op.id === n.id && op.stop !== undefined).map((op) => op.stop)),
    [[0.9 + 0.15], [], [0.9 + 0.15]],
    'let go at 0.9: the pluck once its release has faded, osc 2 silent already, the noise as the voice ends',
  );
});

test("an envelope's amount as its cable draws it (I1h3): its unit and its range by its target's kind, a gain's share of its level, a pitch's or a cutoff's semitones, FM's index, anything else its own", () => {
  const spec = (target) => {
    const { unit, range } = amountSpec(target);
    return [unit, range];
  };
  assert.deepEqual(spec('vca.gain'), ['× level', [0, 2, 0.01]]);
  assert.deepEqual(spec('osc 2.gain'), ['× level', [0, 2, 0.01]]);
  assert.deepEqual(spec('filter.frequency'), ['st', [-48, 48, 0.1]]);
  assert.deepEqual(spec('oscs.frequency'), ['st', [-48, 48, 0.1]]);
  assert.deepEqual(spec('fm 1.gain'), ['index', [0, 20, 0.01]]);
  assert.deepEqual(spec('oscs.detune'), ['cents', [-100, 100, 1]], "an osc's detune, as it declares it");
});

test("an envelope's shape (I1h): from 0 after its delay, up to 1 over its attack, held over its hold, down to its sustain over its decay; with no attack from 1; released from where it is at the note-off, or with no release ringing on; its amount in its target's units", () => {
  const context = { beat: 0.8, random: () => 0.5 };
  const on = (envelope, note = { duration: 1 }, target = 'osc 1.gain') =>
    envelopeEvents(
      { oscs: [{}], envelopes: [{ target, ...envelope }] },
      0,
      { pitch: 69, velocity: 0.8, ...note },
      context,
    ).automation;
  const close = (actual, expected, what) => {
    assert.equal(actual.length, expected.length, what);
    actual.forEach((event, i) =>
      event.forEach((part, k) =>
        typeof part === 'number' ?
          assert.ok(Math.abs(part - expected[i][k]) < 1e-9, `${what}: ${i} ${k}`)
        : assert.equal(part, expected[i][k]),
      ),
    );
  };
  assert.deepEqual(
    on(perc(0.005, 0.3)),
    [
      ['set', 0.0001, 0],
      ['linear', 0.8, 0.005],
      ['exp', 0.0001, 0.005 + 0.3],
    ],
    'a perc: up to its peak, down to silence; no release, so it rings on past the note-off',
  );
  close(
    on({ delay: 0.1, attack: 0.2, hold: 0.1, decay: 0.3, sustain: 0.5, release: 0.4 }),
    [
      ['set', 0.0001, 0],
      ['set', 0.0001, 0.1],
      ['linear', 0.8, 0.1 + 0.2],
      ['set', 0.8, 0.1 + 0.2 + 0.1],
      ['exp', 0.8 * 0.5, 0.1 + 0.2 + 0.1 + 0.3],
      ['set', 0.8 * 0.5, 1],
      ['exp', 0.0001, 1 + 0.4],
    ],
    "every stage, held over its delay and its hold (I1h2a), released at the note's end from its sustain",
  );
  const early = { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.2 };
  close(
    on(early, { duration: 0.2 }),
    [
      ['set', 0.0001, 0],
      ['linear', 0.8, 0.1],
      ['exp', 0.8 * Math.pow(0.5, (0.2 - 0.1) / 0.3), 0.2],
      ['exp', 0.0001, 0.2 + 0.2],
    ],
    'released before its decay is done: its decay cut at the note-off, at the level it has reached, still running up to it (I1i3), what came after it gone',
  );
  assert.deepEqual(
    on({ amount: 12, decay: 0.25, sustain: 0 }, {}, 'osc 1.frequency'),
    [
      ['set', 2, 0],
      ['exp', 1, 0.25],
    ],
    "no attack: from 1, an octave over its target's own; down in semitones",
  );
  const held = plan(
    { oscs: [{ stop: 3 }], envelopes: [{ target: 'osc 1.gain', ...early }] },
    { pitch: 69, velocity: 0.8 },
    context,
  );
  const gain = held.nodes.find((node) => node.block === 'osc 1' && node.node === 'gain').id;
  const ops = held.controls.release(0.2);
  close(
    ops.find((op) => op.id === gain).events,
    [
      ['cancel', 0.2],
      ['exp', 0.8 * Math.pow(0.5, (0.2 - 0.1) / 0.3), 0.2],
      ['exp', 0.0001, 0.2 + 0.2],
    ],
    'let go: its decay, which the cancel takes away, running again up to where it is, then over its release (I1i3)',
  );
  assert.ok(
    ops.some((op) => op.stop === 0.2 + 0.2),
    'its sources stopped once it has faded',
  );
});

test("an envelope's curve as Web Audio plays it (I1g3): set, ramps from where the last event left it, a target approaching from its start", async () => {
  const { levelAt } = await import('../../automation/index.ts');
  const automation = [
    ['set', 0.0001, 0],
    ['exp', 1, 0.1],
    ['linear', 0.5, 0.3],
    ['target', 0, 0.5, 0.1],
  ];
  const near = (t, expected) =>
    assert.ok(Math.abs(levelAt(automation, t) - expected) < 1e-9, `at ${t}: ${levelAt(automation, t)}`);
  near(0, 0.0001);
  near(0.05, 0.01); // halfway up an exponential ramp: the geometric mean
  near(0.1, 1);
  near(0.2, 0.75);
  near(0.4, 0.5); // held until the target starts
  near(0.6, 0.5 * Math.exp(-1));
  assert.equal(
    levelAt(
      [
        ['set', 0, 0],
        ['exp', 1, 0.1],
      ],
      0.05,
    ),
    0,
    'an exponential ramp from nothing holds, then jumps at its end',
  );
  assert.equal(levelAt([['value', 1]], 0.5), 1, 'a value as it starts');
});

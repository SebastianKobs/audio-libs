// The engine's unit tests (mockup/src/libs/web-audio-engine, out of mockup/test/unit/engine.test.js in W3b), on the stand-in for Web
// Audio beside them, whose time is set by each test: its time mapping, a plan built and its ops run, its buffers, Web Audio's own
// makeup, a pan, a limiter and a meter built. What the garden builds with it is held to the recordings (instruments.test.js); the
// mixer's own in mockup/test/unit/mixer.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from './audio-stand-in.js';
import { Engine, makeupOf } from '../index.ts';
import { noise } from '../buffers.ts';

let time = 0;
class Context extends StandInContext {
  constructor(opts) {
    super(() => time);
    Context.opts = opts;
  }
  resume() {
    super.resume();
    Context.resumed = (Context.resumed ?? 0) + 1;
  }
}
const engine = (more = {}) => {
  time = 10;
  return new Engine({ AudioContext: Context, ...more });
};
// a repeatable run of draws between 0 and 1, the same each time it's made
const draws = () => {
  let drawn = 0;
  return () => (drawn++ % 97) / 97;
};
const into = (ac, node) => ac.rec.edges.filter((e) => e.to === node).map((e) => e.from);
const dB = (g) => 20 * Math.log10(g);
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} is not ${b}`);
// the inserts' blocks, built (F1b, mockup/architecture/mixer-and-fx.md, "Inserts as FX modules"): how Web Audio does what a plan asks, at
// the edge, where Web Audio's own ways are
const unplayed = (node, params = {}) => ({ node, props: {}, params, starts: [], stops: [] });

test("the engine: a low-latency context, and a time of the caller's never in the audio's past", () => {
  const e = engine({ toContext: (t) => t - 2 });
  assert.equal(Context.opts.latencyHint, 'interactive');
  assert.equal(e.now(), 10);
  assert.equal(e.at(13), 11, "the caller's time, turned into the context's");
  assert.equal(e.at(5), 10, 'never into its past: due now, it starts with the next chunk');
});

test("the engine builds a plan at a time, into where it goes, and runs a handle's ops on it", () => {
  const e = engine();
  const dest = e.audioContext.createGain();
  const p = {
    nodes: [
      {
        node: 'oscillator',
        props: { type: 'triangle' },
        params: { frequency: [['value', 220]] },
        starts: [[0]],
        stops: [[1.5]],
      },
      {
        node: 'gain',
        props: {},
        params: {
          gain: [
            ['value', 0],
            ['target', 0.3, 0.01, 0.2],
          ],
        },
        starts: [],
        stops: [],
      },
    ],
    edges: [
      [0, 1],
      [1, 'out'],
    ],
  };
  const [o, g] = e.build(p, 12, dest);
  assert.equal(o.type, 'triangle');
  assert.deepEqual(o.frequency.events, [['value', 220]]);
  assert.deepEqual(o.starts, [[12]]);
  assert.deepEqual(o.stops, [[13.5]]);
  assert.deepEqual(g.gain.events, [
    ['value', 0],
    ['target', 0.3, 12.01, 0.2],
  ]);
  assert.deepEqual(into(e.audioContext, g), [o]);
  assert.deepEqual(into(e.audioContext, dest), [g]);
  e.apply(
    [o, g],
    [
      {
        id: 1,
        param: 'gain',
        events: [
          ['cancel', 0.5],
          ['target', 0.0001, 0.5, 0.05],
        ],
      },
      { id: 0, stop: 0.9 },
    ],
    12,
  );
  assert.deepEqual(g.gain.events.slice(2), [
    ['cancel', 12.5],
    ['target', 0.0001, 12.5, 0.05],
  ]);
  assert.deepEqual(o.stops, [[13.5], [12.9]]);
});

test("the engine's buffers are made once, when first asked for, by their spec: so many seconds of noise (W2b)", () => {
  const e = engine();
  const n = e.buffer({ noise: 2 });
  assert.equal(e.buffer({ noise: 2 }), n, 'the same buffer again');
  assert.equal(n.length, 2 * e.audioContext.sampleRate);
  assert.equal(e.buffer({ noise: 0.2 }).length, Math.floor(0.2 * e.audioContext.sampleRate));
  const p = {
    nodes: [{ node: 'buffer', props: { buffer: { noise: 0.2 }, loop: false }, params: {}, starts: [[0]], stops: [] }],
    edges: [[0, 'out']],
  };
  assert.equal(
    e.build(p, 10, e.audioContext.destination)[0].buffer,
    e.buffer({ noise: 0.2 }),
    'a plan names its buffer',
  );
});

test("a buffer of noise by its length: the samples a name's gave, white noise of that length from the engine's random() (W2b)", () => {
  const e = engine({ random: draws() });
  const made = e.buffer({ noise: 0.01 }).getChannelData(0);
  assert.deepEqual(made, noise(0.01, e.audioContext.sampleRate, draws())[0]);
});

test("Web Audio's own makeup, for a hard knee: 0.6 times how far its curve brings full scale down, as measured in Firefox", () => {
  near(makeupOf(-20, 6), 10, 'ratio 6, threshold -20: a -40 dBFS sine came out at -30');
  near(makeupOf(-33, 6), 16.5, 'threshold -33: at -23.5');
  near(makeupOf(0, 6), 0, 'threshold 0: none');
});

test('a pan, built: a stereo panner, the sound made stereo before it, so a mono sound is as loud in the middle; or a pan pot; with no stereo panner, passed through', () => {
  const e = engine();
  const dest = e.audioContext.createGain();
  const [pan] = e.build({ nodes: [unplayed('panner', { pan: [['value', -0.5]] })], edges: [[0, 'out']] }, 12, dest);
  assert.equal(pan.channelCountMode, 'explicit');
  assert.equal(pan.channelCount, 2);
  assert.deepEqual(pan.pan.events, [['value', -0.5]]);
  assert.deepEqual(into(e.audioContext, dest), [pan]);
  const [pot] = e.build(
    { nodes: [{ ...unplayed('panner', { pan: [['value', -0.5]] }), props: { mono: 'pan pot' } }], edges: [[0, 'out']] },
    12,
    dest,
  );
  assert.notEqual(pot.channelCountMode, 'explicit', "a pan pot: a mono sound panned as it comes, Web Audio's own way");
  assert.equal(pot.mono, undefined, 'made so, not told');
  e.audioContext.createStereoPanner = undefined;
  const [through] = e.build({ nodes: [unplayed('panner', { pan: [['value', -0.5]] })], edges: [[0, 'out']] }, 12, dest);
  assert.deepEqual([through.kind, through.gain.value], ['gain', 1], 'no stereo panner: it passes through, unpanned');
});

test("a limiter, built: its gain into a compressor held at its ceiling as hard as Web Audio's goes, Web Audio's makeup taken back after; set live, in its own units", () => {
  const e = engine();
  const ac = e.audioContext;
  const dest = ac.createGain();
  const [source, limiter] = e.build(
    {
      nodes: [
        unplayed('gain'),
        unplayed('limiter', { gain: [['value', 16]], ceiling: [['value', -0.3]], release: [['value', 0.3]] }),
      ],
      edges: [
        [0, 1],
        [1, 'out'],
      ],
    },
    12,
    dest,
  );
  const [back] = into(ac, dest);
  const [compressor] = into(ac, back);
  const [drive] = into(ac, compressor);
  assert.deepEqual(into(ac, drive), [source], 'the sound comes in at its gain');
  near(dB(drive.gain.value), 16, 'its gain, before it');
  assert.deepEqual(
    ['threshold', 'ratio', 'knee', 'attack', 'release'].map((k) => compressor[k].value),
    [-0.3, 20, 0, 0.003, 0.3],
    'it acts at the ceiling',
  );
  near(dB(back.gain.value), -makeupOf(-0.3, 20), "Web Audio's makeup, taken back");
  e.apply(
    [source, limiter],
    [
      { id: 1, param: 'gain', events: [['target', 17, 0.5, 0.05]] },
      { id: 1, param: 'ceiling', events: [['target', -3, 0.5, 0.05]] },
    ],
    12,
  );
  const last = (param) => param.events.at(-1);
  near(dB(last(drive.gain)[1]), 17, 'live: each dB more, a dB louder');
  assert.equal(last(drive.gain)[2], 12.5, 'at its time');
  assert.deepEqual(last(compressor.threshold), ['target', -3, 12.5, 0.05], 'its ceiling, where it acts');
  near(dB(last(back.gain)[1]), -makeupOf(-3, 20), 'its makeup followed');
  assert.throws(
    () => e.build({ nodes: [unplayed('gain'), unplayed('limiter')], edges: [[0, [1, 'gain']]] }, 12, dest),
    /not a param a sound can be cabled into/,
    "its params are in its own units: a sound can't move them",
  );
});

test("a limiter's params moved as a plan's automation moves any: set, ramped either way, cancelled, each move made on every Web Audio param behind it, in its units; its value read back in its own", () => {
  const e = engine();
  const ac = e.audioContext;
  const dest = ac.createGain();
  const [source, limiter] = e.build(
    {
      nodes: [unplayed('gain'), unplayed('limiter')],
      edges: [
        [0, 1],
        [1, 'out'],
      ],
    },
    12,
    dest,
  );
  const [back] = into(ac, dest);
  const [compressor] = into(ac, back);
  const [drive] = into(ac, compressor);
  e.apply(
    [source, limiter],
    [
      { id: 1, param: 'gain', events: [['value', 6]] },
      {
        id: 1,
        param: 'ceiling',
        events: [
          ['cancel', 0.1],
          ['set', -1, 0.1],
          ['linear', -2, 0.2],
          ['exp', -3, 0.3],
        ],
      },
    ],
    12,
  );
  near(dB(drive.gain.value), 6, 'its gain, in dB');
  assert.equal(limiter.params.gain.value, 6, 'read back in dB');
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
  moves.forEach(([, gain], k) => near(dB(gain), -makeupOf([-1, -2, -3][k], 20), "Web Audio's makeup, taken back"));
});

test("a limiter's points and readings: its in after its gain, its out after its makeup is taken back; how much it takes away, in dB", () => {
  const e = engine();
  const ac = e.audioContext;
  const dest = ac.createGain();
  const [, limiter] = e.build(
    {
      nodes: [unplayed('gain'), unplayed('limiter')],
      edges: [
        [0, 1],
        [1, 'out'],
      ],
    },
    12,
    dest,
  );
  const [back] = into(ac, dest);
  const [compressor] = into(ac, back);
  const [drive] = into(ac, compressor);
  assert.deepEqual([limiter.points.in, limiter.points.out], [drive, back]);
  compressor.reduction = -4.5;
  assert.equal(limiter.readings.reduction(), 4.5, 'what it takes away');
});

test('a meter the engine builds on a node (F5a): a splitter, an analyser for each side reading a window of 1024 samples, its peak the loudest of the last window, left or right', () => {
  const e = engine();
  const ac = e.audioContext;
  const node = ac.createGain();
  const meter = e.meter(node);
  const splitter = ac.rec.edges.find((x) => x.from === node).to;
  assert.equal(splitter.kind, 'splitter', 'the node into a splitter');
  const sides = ac.rec.edges.filter((x) => x.from === splitter).map((x) => x.to);
  assert.deepEqual(
    sides.map((a) => [a.kind, a.fftSize]),
    [
      ['analyser', 1024],
      ['analyser', 1024],
    ],
    'an analyser for each side',
  );
  sides[0].samples = [0.1, -0.5, 0.2];
  sides[1].samples = [0.3];
  assert.equal(meter.peak(), 0.5, 'the loudest sample, left or right, either sign');
});

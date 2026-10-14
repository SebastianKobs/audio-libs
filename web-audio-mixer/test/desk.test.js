// A whole desk built from data (mockup/src/libs/web-audio-mixer/desk.ts, U2c5c): the mixer on the desk's routing, its master's insert
// and volume its owner's; each strip at the values its owner hands over, a slot or a chain's module among the device params built at its
// params as they play and set through them; each FX channel's chain of modules as they play, by the effect its data names; each strip's
// chains handed back; the chains following the tempo. On the engine and its stand-in for Web Audio, as build.test.js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { DeviceParams, FILTER, FxModules, GAIN, DEVICES, LIMITER_SETTINGS } from '../../web-audio-fx/index.ts';
import { nameOf } from '../../desk-plan/index.ts';
import { Desk } from '../index.ts';

let time = 0;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
const beat = 60 / 72;
// a desk as data: a reverb with its Utility, garden sings, a delay into it whose chain has params of its own
const DESK = [
  {
    fx: 'reverb',
    chain: [{ effect: 'room' }],
    inserts: [{ slot: 'utility', device: 'utility', start: { level: 0.6 } }],
  },
  { bus: 'sings', inserts: [{ slot: 'air', device: 'filter' }] },
  { fx: 'delay', chain: [{ effect: 'echo', params: { cutoff: 500 } }], sends: ['reverb'], out: 'sings' },
];
// the master's strip as data: a trim, then the limiter
const MASTER = {
  inserts: [
    { slot: 'trim', device: 'utility', start: { level: 0.5 } },
    { slot: 'limiter', device: 'limiter' },
  ],
};
// each effect's module, by its name
const MODULE_OF = { room: 'gain', echo: 'filter' };
// whether sound goes from one node to another, through any on the way
function reaches(ac, from, to) {
  const seen = new Set([from]);
  const next = [from];
  while (next.length) {
    const node = next.shift();
    if (node === to) {
      return true;
    }
    for (const edge of ac.rec.edges.filter((e) => e.from === node && !seen.has(e.to))) {
      seen.add(edge.to);
      next.push(edge.to);
    }
  }
  return false;
}

test("a desk built from data: the mixer on its routing, its master's volume its owner's; each strip at the values its owner hands over, its chains handed back; a bus's way in", () => {
  const { desk, built, engine } = deskOf();
  assert.equal(desk.mixer, null, 'none until the audio starts');
  desk.build(engine);
  const { mixer } = desk;
  assert.deepEqual(
    [mixer.routing.outOf('delay'), mixer.routing.sentTo('delay')],
    ['sings', ['reverb']],
    'on its routing',
  );
  assert.deepEqual(mixer.master.gain.events.at(-1).slice(0, 2), ['target', 0.7], 'at its volume');
  assert.equal(mixer.strips.sings.fader.gain.value, 0.9, 'at the values its owner hands over');
  assert.equal(desk.bus.sings, mixer.strips.sings.input, "a bus's way in");
  assert.deepEqual(
    built.map(([strip, chains]) => [strip, Object.keys(chains)]),
    [
      ['master', ['trim', 'limiter']],
      ['reverb', ['utility']],
      ['sings', ['air']],
      ['delay', []],
    ],
    "each strip's chains handed back",
  );
  assert.deepEqual(
    Object.keys(desk.slots),
    ['master', 'reverb', 'sings', 'delay'],
    "and kept, each strip's slots' chains, for what reads them",
  );
  assert.equal(desk.slots.reverb.utility, built.find(([strip]) => strip === 'reverb')[1].utility);
});

test("a slot among the device params built at its params as they play and set through them; one that isn't at what its owner hands over", () => {
  const { desk, built, engine, params } = deskOf();
  desk.build(engine);
  const chainOf = (strip, slot) => built.find(([name]) => name === strip)[1][slot];
  const level = chainOf('reverb', 'utility').paramOf('gain.gain');
  assert.equal(level.value, 0.6, "the reverb's Utility at its params as they play");
  params.set('reverb/utility', 'level', 0.3);
  assert.deepEqual(level.events.at(-1).slice(0, 2), ['target', 0.3], 'set through them');
  assert.equal(chainOf('sings', 'air').paramOf('filter.frequency').value, 1200, "the air at its owner's");
});

test("the master's insert slots, from its data, a chain in their order between the sum and the master volume; its points and readings named by slot; a slot among the device params at its params and set through them (U2c5c)", () => {
  const { desk, built, engine, params } = deskOf();
  desk.build(engine);
  const ac = engine.audioContext;
  const { mixer } = desk;
  const [, chains] = built.find(([strip]) => strip === 'master');
  const trim = chains.trim.nodeOf('gain.gain').node;
  const drive = chains.limiter.points().in;
  assert.ok(reaches(ac, mixer.sum, trim), 'the sum into the first');
  assert.ok(reaches(ac, trim, drive) && !reaches(ac, drive, trim), 'the trim, then the limiter');
  assert.ok(reaches(ac, drive, mixer.master), 'the last into the master volume');
  mixer.peak('limiter in');
  assert.ok(
    ac.rec.edges.some((edge) => edge.from === drive && edge.to.kind === 'splitter'),
    "a meter on the limiter's in, by its slot and the point's name",
  );
  assert.equal(
    typeof mixer.reading('limiter reduction'),
    'number',
    "what it takes away, by its slot and the reading's name",
  );
  assert.equal(
    chains.limiter.paramOf('limiter.gain').value,
    LIMITER_SETTINGS.gain,
    'at its params as they play, in dB',
  );
  params.set('master/limiter', 'gain', 10);
  const [kind, gain] = chains.limiter.nodeOf('limiter').input.gain.events.at(-1);
  assert.deepEqual(
    [kind, 20 * Math.log10(gain)].map((v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v)),
    ['target', 10],
    'set through them',
  );
  assert.equal(trim.gain.value, 0.5, 'a slot not among them at its start');
});

test("an FX channel's chain of modules as they play, by the effect its data names, its own params among the device params; an edit to either rebuilding it; following the tempo", () => {
  mock.timers.enable({ apis: ['setTimeout'] }); // an old chain rings out before it's let go
  try {
    const { desk, engine, params, modules } = deskOf();
    desk.build(engine);
    const biquads = () => engine.audioContext.rec.nodes.filter((node) => node.kind === 'biquad');
    assert.equal(desk.chains.delay.paramOf('filter.frequency').value, 500, 'its own params');
    const count = biquads().length;
    params.set('delay/echo', 'cutoff', 900);
    assert.equal(biquads().length, count + 1, 'its own param set: rebuilt');
    assert.equal(desk.chains.delay.paramOf('filter.frequency').value, 900, 'playing it');
    modules.set('filter', { ...FILTER, params: { q: 3, cutoff: 24000 } });
    assert.equal(biquads().length, count + 2, 'its module edited: rebuilt');
    const tempo = mock.method(desk.chains.delay, 'tempo');
    desk.tempo(0.5);
    assert.deepEqual(
      tempo.mock.calls.map((call) => call.arguments),
      [[0.5]],
      'following the tempo',
    );
  } finally {
    mock.timers.reset();
  }
});

// a desk of its own: its master's inserts, its modules as they play, its device params (the reverb's Utility, the delay's own, the
// master's limiter), the values its owner hands over, what's handed back as it's built
function deskOf() {
  time = 10;
  const engine = new Engine({ AudioContext: Context });
  const modules = new FxModules({ modules: { gain: GAIN, filter: FILTER } });
  const params = new DeviceParams({ beat: () => beat });
  params.add('reverb/utility', { start: { level: 0.6, pan: 0 }, ports: DEVICES.utility.ports });
  params.add('delay/echo', { start: { cutoff: 500 } });
  params.add('master/limiter', { start: { ...LIMITER_SETTINGS }, ports: DEVICES.limiter.ports });
  const built = [];
  const desk = new Desk({
    desk: DESK,
    master: MASTER,
    devices: DEVICES,
    modules,
    moduleOf: (effect) => MODULE_OF[effect],
    params,
    beat: () => beat,
    valuesOf: (entry) => (nameOf(entry) === 'sings' ? { volume: 0.9, params: { air: () => ({ cutoff: 1200 }) } } : {}),
    built: (strip, chains) => built.push([strip, chains]),
    volume: () => 0.7,
  });
  return { desk, built, engine, params, modules };
}

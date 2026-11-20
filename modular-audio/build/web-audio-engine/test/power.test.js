// The audio's power (mockup/src/libs/modular-audio/build/web-audio-engine/power.ts), on the stand-in for Web Audio: the audio started, paused and
// resumed, as a transport and a first touch ask.
// Start: the engine made once, what's built built in it into the output after it, the clock on the audio's time, then
// told; once started, back on; not while paused.
// Pause: the output faded out, the audio context suspended once it's quiet.
// Resume: faded in again, never at full volume: from where the fade got to if the context hadn't stopped yet, else
// from silence, the context resumed; started if it hadn't.
// Woken: back on after the browser stopped the sound, the audio never started by it.
// Warmed up, before the first touch: the engine made and its processors loading, nothing built, the clock not on its time, nothing
// told; the first start builds in it and resumes it, faded in from silence, whether the processors have loaded or not.
// What's built there makes a worklet node of a processor that had loaded, the library's limiter in place of one that hadn't.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPower, STOP_AFTER } from '../index.ts';
import { FADE_IN, FADE_OUT, NO_WORKLETS } from '../../web-audio/index.ts';
import { into, StandInContext } from '../../web-audio/test/audio-stand-in.js';
import { oneBlockPlan } from '../../web-audio/test/blocks.js';
import { installWorkletNodes } from '../../web-audio/test/worklet-nodes.js';

// The power on the stand-in's audio, the browser's as it's handed in; the contexts made, what's built, the clock's audio and
// what's told kept. session: iOS's audio session, where the browser has one. suspended: contexts made suspended, as a browser makes
// them before a touch. behave: how a module is added to the contexts' worklets, as the stand-in's `behave` has it. building: a plan
// built as the desk is, where there is one.
function powerOn(session, { suspended = false, behave, building } = {}) {
  const kept = { engines: [], builds: [], clocks: [], told: [] };
  const AudioContext = class extends StandInContext {
    constructor() {
      super(() => 4);
      if (suspended) {
        this.state = 'suspended';
      }
      if (behave) {
        this.audioWorklet.behave = behave; // how a module loads
      }
      kept.engines.push({ context: this, session: session?.type });
    }
  };
  const browser = () => ({ AudioContext, audioSession: session });
  const build = (make) => {
    kept.builds.push(make);
    if (building) {
      make(building);
    }
  };
  const clock = { useAudio: (context) => kept.clocks.push(context), audio: { toContext: (t) => t - 1 } };
  const power = new AudioPower({ browser, build, beat: () => 0.5, clock });
  power.onStart(() => kept.told.push(kept.clocks.length));
  return { power, kept };
}
// the output's last fade, as its gain was told
const lastFade = (power) => power.output.node.gain.events.at(-1);

test('not started at first: no engine, no output', () => {
  const { power, kept } = powerOn();
  assert.deepEqual([power.started, power.paused, power.engine, power.output], [false, false, null, null]);
  assert.equal(kept.engines.length, 0);
});

test("started: the engine made, what's built built into the output after it, the clock on the audio's time, then told; once", () => {
  const { power, kept } = powerOn();
  power.start();
  power.start();
  assert.equal(power.started, true);
  assert.equal(kept.engines.length, 1, 'the engine made once');
  const context = power.engine.audioContext;
  assert.equal(context, kept.engines[0].context, "in the browser's audio");
  assert.deepEqual(into(context, context.destination), [power.output.node], 'the output into where the sound goes');
  assert.equal(kept.builds.length, 1, "what's built built once");
  assert.deepEqual(kept.clocks, [context], "the clock on the audio's time");
  assert.deepEqual(kept.told, [1], 'told once, the clock on the audio already');
});

test("the engine: the clock's time onto the audio's; iOS's audio session, where there is one, set for playback before the context is made, which ignores the silent switch", () => {
  const session = {};
  const { power, kept } = powerOn(session);
  power.start();
  assert.equal(kept.engines[0].session, 'playback', 'set before');
  assert.equal(power.engine.at(5), 4, "the clock's time onto the audio's");
  const { power: none } = powerOn();
  none.start();
  assert.equal(none.started, true, 'none: the platform as it is');
});

test("built alone: the engine and what's built, no clock on it, nothing told, as a desk's offline render asks", async () => {
  const { power, kept } = powerOn();
  assert.equal(await power.build(), power.engine);
  assert.equal(kept.builds.length, 1);
  assert.deepEqual([kept.clocks, kept.told], [[], []]);
});

test('paused: nothing started; resumed, started', () => {
  const { power, kept } = powerOn();
  power.pause();
  power.start();
  assert.deepEqual([power.paused, power.started], [true, false]);
  power.resume();
  assert.deepEqual([power.paused, power.started, kept.told], [false, true, [1]]);
});

test('paused: the output faded out, the context suspended once it has; resumed before that, faded back in from where it got to', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { power } = powerOn();
  power.start();
  const context = power.engine.audioContext;
  power.pause();
  assert.deepEqual(lastFade(power), ['target', 0, 4, FADE_OUT]);
  t.mock.timers.tick(STOP_AFTER - 1);
  assert.equal(context.state, 'running', 'still fading');
  power.resume();
  assert.deepEqual(lastFade(power), ['target', 1, 4, FADE_IN], 'back before it stopped: from where the fade got to');
  t.mock.timers.tick(10);
  assert.equal(context.state, 'running', 'it never stops');
});

test('paused long enough, the context suspended; resumed, faded in from silence and the context resumed', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { power } = powerOn();
  power.start();
  const context = power.engine.audioContext;
  power.pause();
  t.mock.timers.tick(STOP_AFTER);
  assert.equal(context.state, 'suspended');
  const fades = power.output.node.gain.events.length;
  power.pause();
  assert.equal(power.output.node.gain.events.length, fades, 'not running: nothing to fade');
  power.resume();
  assert.deepEqual(power.output.node.gain.events.slice(fades), [
    ['cancel', 4],
    ['set', 0, 4],
    ['target', 1, 4, FADE_IN],
  ]);
  assert.equal(context.state, 'running');
});

test('woken: back on after the browser stopped the sound, from silence; never started by it, nor while paused', () => {
  const { power } = powerOn();
  power.wake();
  assert.equal(power.started, false, 'never started: only a touch starts the audio');
  power.start();
  const context = power.engine.audioContext;
  void context.suspend(); // a phone locking
  power.wake();
  assert.equal(context.state, 'running');
  assert.deepEqual(lastFade(power), ['target', 1, 4, FADE_IN]);
});

const MODULES = { crusher: 'crusher.js' };

test('warmed up: the engine made, iOS session set, its processors loaded; nothing built, the clock not on it, nothing told, not started', async () => {
  const session = {};
  const { power, kept } = powerOn(session, { suspended: true });
  const loading = power.warmUp(MODULES);
  assert.equal(kept.engines.length, 1, 'the engine made now');
  assert.equal(kept.engines[0].session, 'playback', 'set before the context is made');
  await loading;
  assert.deepEqual(kept.engines[0].context.audioWorklet.added, ['crusher.js']);
  assert.deepEqual([power.started, power.engine, power.output], [false, null, null]);
  assert.deepEqual([kept.builds.length, kept.clocks, kept.told], [0, [], []]);
  assert.equal(kept.engines[0].context.state, 'suspended', 'not resumed before a touch');
});

test('started after a warm-up: built in that engine with its processors, the clock on it, told once, the context resumed, faded in from silence', async () => {
  const { power, kept } = powerOn(undefined, { suspended: true });
  await power.warmUp(MODULES);
  power.start();
  power.start();
  const context = kept.engines[0].context;
  assert.equal(kept.engines.length, 1, 'no second engine');
  assert.equal(power.engine.audioContext, context, 'built in the warmed-up one');
  assert.notEqual(power.engine.worklets, NO_WORKLETS, 'the processors that loaded');
  assert.deepEqual(into(context, context.destination), [power.output.node]);
  assert.deepEqual([kept.builds.length, kept.clocks, kept.told], [1, [context], [1]]);
  assert.equal(context.state, 'running', 'resumed');
  assert.deepEqual(
    power.output.node.gain.events,
    [
      ['value', 0],
      ['target', 1, 4, FADE_IN],
    ],
    'from silence',
  );
});

test('started while its processors are still loading: built at once with none, the loading going on; they join the engine once loaded', async () => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  const { power, kept } = powerOn(undefined, { suspended: true, behave: () => held });
  const loading = power.warmUp(MODULES);
  power.start();
  assert.equal(power.started, true, 'not waiting for the processors');
  assert.equal(kept.builds.length, 1);
  assert.equal(power.engine.worklets, NO_WORKLETS, 'none yet');
  release();
  await loading;
  assert.equal(power.engine.audioContext, kept.engines[0].context);
  assert.notEqual(power.engine.worklets, NO_WORKLETS, 'those loaded by then');
});

test("what's built made with the engine's processors: a lookahead limiter a worklet where the warm-up had loaded them, the library's limiter where the start came first", async () => {
  const uninstall = installWorkletNodes();
  try {
    const modules = { 'lookahead limiter': 'limiter.js' };
    const kindsBuilt = (kept) =>
      kept.engines[0].context.rec.nodes
        .map((node) => node.kind)
        .filter((kind) => kind === 'worklet' || kind === 'compressor');
    const building = oneBlockPlan('lookahead limiter');
    const loaded = powerOn(undefined, { suspended: true, building });
    await loaded.power.warmUp(modules);
    loaded.power.start();
    assert.deepEqual(kindsBuilt(loaded.kept), ['worklet']);
    let release;
    const held = new Promise((resolve) => (release = resolve));
    const early = powerOn(undefined, { suspended: true, building, behave: () => held });
    const loading = early.power.warmUp(modules);
    early.power.start();
    assert.deepEqual(kindsBuilt(early.kept), ['compressor'], 'the loading not ended at the start');
    release();
    await loading;
  } finally {
    uninstall();
  }
});

test('warmed up once: another warm-up, or one after the start, makes no engine', async () => {
  const { power, kept } = powerOn();
  await power.warmUp(MODULES);
  await power.warmUp(MODULES);
  power.start();
  await power.warmUp(MODULES);
  assert.equal(kept.engines.length, 1);
});

test('built alone after a warm-up: in an engine of its own, as an offline render asks; the warmed-up one left for the first start', async () => {
  const { power, kept } = powerOn(undefined, { suspended: true });
  await power.warmUp(MODULES);
  const own = await power.build();
  assert.equal(kept.engines.length, 2, 'its own engine made');
  assert.equal(own.audioContext, kept.engines[1].context);
  assert.notEqual(own.audioContext, kept.engines[0].context, 'not the warmed-up one');
});

test('built alone after a warm-up: the processors it was handed loaded into its own engine before it builds, so an offline render hears them', async () => {
  const uninstall = installWorkletNodes();
  try {
    const modules = { 'lookahead limiter': 'limiter.js' };
    const { power, kept } = powerOn(undefined, { suspended: true, building: oneBlockPlan('lookahead limiter') });
    await power.warmUp(modules);
    const own = await power.build();
    assert.deepEqual(own.audioContext.audioWorklet.added, ['limiter.js'], 'loaded into its own engine');
    const kinds = own.audioContext.rec.nodes.map((node) => node.kind);
    assert.ok(kinds.includes('worklet'), 'the limiter a worklet');
    assert.ok(!kinds.includes('compressor'), "not the library's");
    assert.equal(kept.engines.length, 2);
  } finally {
    uninstall();
  }
});

test('built alone with no warm-up: nothing to load, built with none', async () => {
  const { power } = powerOn();
  const own = await power.build();
  assert.equal(own.worklets, NO_WORKLETS);
});

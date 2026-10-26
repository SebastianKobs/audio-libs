// The audio's power (mockup/src/libs/modular-audio/build/web-audio-engine/power.ts), on the stand-in for Web Audio: the audio started, paused and
// resumed, as a transport and a first touch ask.
// Start: the engine made once, what's built built in it into the output after it, the clock on the audio's time, then
// told; once started, back on; not while paused.
// Pause: the output faded out, the audio context suspended once it's quiet.
// Resume: faded in again, never at full volume: from where the fade got to if the context hadn't stopped yet, else
// from silence, the context resumed; started if it hadn't.
// Woken: back on after the browser stopped the sound, the audio never started by it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPower, STOP_AFTER } from '../index.ts';
import { FADE_IN, FADE_OUT } from '../../web-audio/index.ts';
import { into, StandInContext } from '../../web-audio/test/audio-stand-in.js';

// The power on the stand-in's audio, the browser's as it's handed in; the contexts made, what's built, the clock's audio and
// what's told kept. session: iOS's audio session, where the browser has one.
function powerOn(session) {
  const kept = { engines: [], builds: [], clocks: [], told: [] };
  const AudioContext = class extends StandInContext {
    constructor() {
      super(() => 4);
      kept.engines.push({ context: this, session: session?.type });
    }
  };
  const browser = () => ({ AudioContext, audioSession: session });
  const build = (make) => kept.builds.push(make);
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

test("built alone: the engine and what's built, no clock on it, nothing told, as a desk's offline render asks", () => {
  const { power, kept } = powerOn();
  assert.equal(power.build(), power.engine);
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

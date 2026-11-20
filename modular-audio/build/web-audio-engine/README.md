# modular-audio/build/web-audio-engine

The Web Audio builder run in a browser, on the one clock: the audio context a plan is built in, the audio's power started on a first touch, and a builder in the engine's context, so a plan is built with no clock of its own.

Depends on: `base/util`, `modular-audio/build/web-audio`, `modular-audio/plan/format`, `sequencing/clock`.

```ts
import type { Clock } from '../../../sequencing/clock/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import { AudioPower, EngineBuilding } from './index.ts';

declare const clock: Clock;
declare const plan: Plan;
declare const crusherUrl: string; // a processor's module, as the app's bundler gives it
const power = new AudioPower({
  browser: () => ({ AudioContext }), // the browser's audio, read at the first start (with its audioSession where there is one)
  build: (make) => make(plan), // what's built: the function handed in builds it, so the engine knows no desk
  beat: () => 60 / 96, // a beat's length now, for synced times
  clock, // its beat grid put on the audio's time
});
power.onStart(() => console.log('the audio runs'));
await power.warmUp({ crusher: crusherUrl }); // at load: the engine made, its processors loaded by URL; nothing built or started
power.start(); // on the first touch: what's built built in that engine into the faded-in output, the context resumed
power.pause(); // a transport's stop: the output fades out, the context is suspended once quiet
const building = new EngineBuilding({ engine: () => power.engine, beat: () => 60 / 96 });
const { builder, into, at } = building.into(power.output!.node); // an instrument's builder, at its first note
```

How the audio starts, in order:

1. The browser's audio is read and iOS's audio session set to playback, so the silent switch is ignored. `warmUp()` does this at load, with step 2 and the processors' loading, so a first touch has nothing left to wait for; a start with no warm-up does it then.
2. A `ClockedContext` is made on the clock's time, suspended where the browser asks until the first touch.
3. What's built is built by the Web Audio builder with the processors loaded by then, into an `Output` that fades in from silence, never at full volume, and the context is resumed.
4. The clock's beat grid is put on the audio's time, then `onStart()`'s listeners are told.

A start before the processors have loaded builds with those that have: a block whose processor hasn't loaded passes through or falls back, and an instrument made later gets those loaded by then.

Once started, a start turns the audio back on; while paused it does nothing. A pause fades the output out and suspends the context after 400 ms, once it's quiet. A resume before that fades in again from where the fade got to; after it, from silence with the context resumed, and starts the audio if it hadn't. `wake()` turns it back on after the browser stopped the sound, and never starts it.

| Export | What it does |
|---|---|
| `new ClockedContext(options)`: `audioContext`, `at()`, `loadProcessors()`, `worklets` | The audio context a plan is built in, made at a low latency from the browser's class handed in. `at(t)` is a clock's time on the context's, never into its past; `loadProcessors(modules)` loads the processors into it, and `worklets` is those that loaded, none until then (`context.ts`). |
| `ClockedContextOptions` | What it's made from: the `AudioContext` class and optionally `toContext`, a clock's time onto the context's (`context.ts`). |
| `new AudioPower(making)`: `warmUp()`, `start()`, `build()`, `pause()`, `resume()`, `wake()`, `onStart()`, `started`, `paused`, `engine`, `output` | The audio's power. `warmUp(modules)` makes the engine and loads the processors ahead of the first touch, and hands back a promise that's kept once they're loaded or have failed; `build()` makes an engine of its own, never the warmed-up one, and builds in it with no clock and nothing told, as an offline render asks (`power.ts`). |
| `STOP_AFTER` | How long a pause waits, 400 ms, for the output's fade to go quiet before the context is suspended (`power.ts`). |
| `BrowserAudio`, `EngineOnceStarted` | The browser's `AudioContext` class and iOS's audio session where there is one; the engine as its users ask for it, none until the audio starts (`power.ts`). |
| `new EngineBuilding({ engine, beat })`: `into()` | A `BuildingIn` once the audio runs: the Web Audio builder in the engine's context with the worklets loaded into it, into where it's told, with its own draws where it has them. The noise's buffers are made with the first and shared by every builder in that context (`engine-building.ts`). |
| `BuildingIn`, `buildingIn()` | A builder in a context, where its sound goes, the time now and a clock's time on it. `buildingIn()` makes one in a context of its own, as an offline render asks (`engine-building.ts`). |

Tests: `test/context.test.js`, `test/power.test.js` and `test/engine-building.test.js`, on the stand-in for Web Audio in `libs/modular-audio/build/web-audio/test/audio-stand-in.js`.

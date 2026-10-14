# web-audio-engine

The edge to Web Audio: a context, and plans (`libs/audio-plan/`) built in it. A package of its own since W3b, moved out of `sound/`, which uses it as the tool does. It knows no clock and reads no globals: what it needs is passed in. It makes every Web Audio node of the sound, from a plan, and nothing else does (F6c): a strip's stages, a note's own stages, its air and gains (`NoteStages`, `libs/web-audio-synth/`; a spot's until G0c3), and a pan pot (the test note's) are modules it builds (`libs/web-audio-fx/`'s `BuiltModule`); only a meter's nodes, which listen, it makes on its own. The import test keeps it so (`audioNodeProblems()`, `mockup/test/module-rules.js`). Its parts (F6d): the `Engine` (`index.ts`); the kinds of node a plan names (`NodeKind`, W2a), made in the context (`nodes.ts`); a plan's nodes made, started, wired and automated (`build.ts`); a buffer's samples (`buffers.ts`); a meter (`meters.ts`); a limiter (`limiter.ts`), a node built from several (`composite.ts`), its params in the plan's units (`param-in-units.ts`).

```ts
import { Engine } from './index.ts';
const engine = new Engine({ AudioContext, toContext: t => t - offset });
const made = engine.build(plan, engine.at(when), dest);   // when: your clock's time; at() never maps it into the audio's past
engine.apply(made, plan.controls.release(0.5), engine.at(when));
```

| | |
|---|---|
| `new Engine({ AudioContext, toContext, latencyHint, random })` | makes the context, for low latency (`'interactive'`). iOS's audio session, whether the silent switch is heeded, is the app's to set, before it makes the engine (`tool/audio/studio/engine.ts`, W3a) |
| `audioContext`, `now()` | the context, and its time |
| `at(t)` | a time of the caller's in the context's, with `toContext`, never in its past: a sound due now starts with the next chunk the audio renders |
| `build(plan, t, destination)` | makes a plan's nodes at `t`, the context's time, into `destination`, and returns them; with no `destination`, its way out is the caller's to wire (an FX channel's input, before its chain) |
| `apply(nodes, operations, t)` | runs a handle's or a note's controls' operations on them |
| `buffer(spec)` | a buffer a plan names, made once, when it's first asked for (`buffers.ts`, pure, with the `random()` the engine was given): `{ noise: 2 }`, 2 s of white noise, any length; `{ impulse: 3.5 }`, a reverb's impulse response, two channels of noise darkening as it decays (`BufferSpec`, the plan's; a noise block's `'noise'` and `'breath'` its own, W2b) |
| `canPan()` | whether the context has a stereo panner: where it hasn't, a plan's panner passes the sound through, unpanned, and the mixer gives a strip no pan |
| `meter(node)` | a meter on `node` (`meters.ts`): a splitter and an analyser for each side, made as it's asked for; its `peak()`, the loudest sample of its last window of 1024, left or right, as the mixer's meters read it |
| `makeupOf(threshold, ratio)` | Web Audio's compressor adds a makeup gain of its own, which nothing turns off: for a hard knee, 0.6 × how far its curve brings full scale down, in dB (the spec's, measured in Firefox). `back`, a gain after the compressor, takes it back, so its gain alone sets how loud. The limiter's settings are the Limiter module's (`LIMITER_SETTINGS`, `libs/web-audio-fx/inserts.ts`); how it holds there is here, at the edge (`limiter.ts`) |
| `inputOf(node)`, `outputOf(node)`, `sourceOf(node)` | where a built node's sound comes in and goes out, and a node an operation stops: a Web Audio node is its own way in and out; one built from several (`composite.ts`, a limiter) has its own. A source is one of Web Audio's |
| a plan's `panner`, `limiter` | a pan, the sound made stereo before it (`channelCount` 2, explicit), so a mono sound is as loud in the middle, as the mixer's pans are, or, made with `mono: 'pan pot'`, a mono sound panned as it comes, Web Audio's own way, constant power, 3 dB down in the middle; a limiter built from several (`limiterNodes()`, `limiter.ts`): its gain (drive) into a compressor at its ceiling and the gain that takes its makeup back, its params in the plan's units (`param-in-units.ts`): its gain in dB, its ceiling in dBFS, its release in s. A sound can't be cabled into one of those. Read as Ableton's: its `points`, where a meter reads it, `in` after its gain and `out`, and its `readings`, `reduction()`, what it takes away now, in dB (`composite.ts`) |

Tested in node, in its `test/` folder, on a stand-in for Web Audio (`test/engine.test.js`, the stand-in `test/audio-stand-in.js`, which the sound's and the tool's tests run on too); what the garden builds with it is held to the recordings (`shared/test-vectors/instruments/`).

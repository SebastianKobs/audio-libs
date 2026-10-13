# web-audio-mixer

The desk every sound goes through, in the engine's context, laid out as on a mixing desk: a bigger mix gets fuller, never louder, and nothing starts at full volume. A package of its own since X4, moved out of `sound/`, on the routing, the engine and the FX chains (`libs/mixer/`, `libs/web-audio-engine/`, `libs/web-audio-fx/`); it makes no node itself, but connects the nodes the engine built, so another engine needs its own.

```
channel ─ fader ─┬──────────────────────────────────────────────▶ master (or a bus)
                 ├─▶ send ─────────────▶ FX channel's input
                 └─ room (at its level) ▶ FX channel's input
bus (a submix) ─ fader ───────────────────────────────────────────▶ master
FX channel: input ─▶ chain of FX modules ─▶ level ─▶ pan ─┬─▶ master (or a bus)
                                                          └─▶ sends ─▶ other FX channels' inputs
master: the sum ─▶ its insert (the limiter, built by the caller) ─▶ master volume ─▶ output
```

```ts
import { Mixer } from './index.ts';
const mixer = new Mixer(engine, { volume: 0.6, master: limiter });   // the master starts at 0 and fades in; limiter built by the caller
const reverb = mixer.fx('reverb', { level: 0.6 });   // build its chain (libs/web-audio-fx/) between reverb.input and reverb.level
const tap = mixer.channel('tap', { volume: 0.7, sends: ['reverb'], room: 'reverb' });
const sings = mixer.bus('sings', { volume: 1, room: 'reverb' });
const echo = mixer.fx('delay 1', { level: 0.8, pan: -0.45, sends: { reverb: 0.4 }, out: 'sings' });
tap.volume(0.5);                                       // glides the fader and the room
```

| | |
|---|---|
| `new Mixer(engine, { volume, master })` | the sum, its insert, the master, into the context's output. The master fades in from 0 (0.25 s). `master`, a `MasterInsert` the caller built, goes between the sum and the master volume: its `input` and `output`, the `points` a meter reads inside it by name, and its `reduction()`. The desk's is a chain of the Limiter module (`LIMITER`, `libs/web-audio-fx/`), as Ableton's on its master: its gain into it, in dB, held at its ceiling, in dBFS, its release in s. Without one, the sum goes straight into the master |
| `reduction()` | what the master's insert, the limiter, takes away now, in dB; 0 with none |
| `channel(name, { volume, pan, sends, room, out, inserts })` | a `Channel`: a fader, out to the master (`'master'`) or a bus, sent after the fader to the FX channels named, at 1. With `pan`, a stereo panner after the fader, its sends and its way out after it, so a mono sound is as loud in the middle (`panTo(v)`). With `room`, a second input that goes only to that FX channel, the extra reverb far sounds get: a send of its own, at its amount (`roomAmount`, 1 if none is given) times the fader's level, set by `sendTo(room, v)` as any send. `input`, `room`, `volume(v)`. With `inserts` ({ name, input, output, tap }, built by the caller), its input runs through each, in order, into its `fader`. A send written `{ to, amount, from }` has a gain of its own (`sendTo(to, v)` glides it), taken after the fader, before it (`from: 'pre'`, after the inserts), or from an insert's `tap`, before that insert's level. Its fader and each send with a gain handed out as stages, the Gain modules they are (`faderStage`, `sendStages`), for what sets them from outside: a replay track's notes, at their time, and the emitter that follows where it's heard (`sound/space/`, F6b) |
| `bus(name, { volume, pan, sends, room, out, inserts })` | a `Channel` of the kind `'bus'`, a submix: a channel whose input takes what's routed into it, channels, FX channels and anything played into it. With sends, a group, as Ableton's: its tracks routed into it, through its fader, sent after it |
| `fx(name, { level, pan, sends, out, inserts })` | an `FxChannel`, stereo: `input`, where sends arrive; a chain of FX modules, built by the caller between `input` and `chainOut`: its `inserts`, as a channel's but after the chain (a Utility at the end, as an Ableton chain ends), in order, into its `level`, or else its `level`; its `level`; a `pan`, if it has one; `sends` to other FX channels by name and amount, taken after the pan, so they keep its panning; out to the master or a bus. `volume(v)`, `panTo(v)` and `sendTo(name, v)` glide its level, its pan and a send; its sends handed out as stages, as a channel's (`sendStages`) |
| `peak(name)` | a strip's peak, as a meter reads it: the loudest sample of the last 1024, left or right, after its fader and pan; `'master'` after its insert and its volume; a point its insert names, inside it: the desk's limiter's `'limiter in'` after its gain, `'limiter out'` after it, before the master volume. Its analysers are made at its first read, so a desk nobody looks at has none |
| `strips` | the desk, by name: each a `Strip`, a `Channel` or an `FxChannel` |
| `volume(v)` | glides the master (0.05 s) |
| `pause()`, `resume()` | the master fades out (0.08 s), and the context stops 0.4 s later. Back before it stopped, it fades in from where it got to; stopped, from 0. Never at full volume |
| `sum`, `master` | its nodes |

Where each strip goes is its `routing`, a `Routing` (`libs/mixer/`, since X3b; drawn out of the mixer in X3a), its own, or its owner's, handed in (`new Mixer(engine, { routing })`, Z3), so what's on the desk is known before there's any sound; a strip already on it is built where it says, a way out asked or not, what's asked agreeing or it throws, and one not on it is put on it as asked. The mixer asks it before it wires: a strip's kind, `channel`, `bus` or `return` (an FX channel), its way out (`outOf(name)`) and what it sends to (`sentTo(name)`). A send or an output goes only to what's on the desk already, so there are no loops; anything else throws. `route(name, out)` moves a strip's output while it plays, to the master or a bus, and refuses one that feeds it, through an output or a send. Every strip has a mute, `muted(on)`: a channel's or bus's at its input, so its sends and room go quiet too, an FX channel's at its output, after its pan, so its own tail does. `routing.silenced(muted, soloed)` says which strips are silent, as Ableton's mute and solo: a solo keeps its way out and what feeds it, and never silences a return. Tested in node on the engine's stand-in for Web Audio (`test/mixer.test.js`, out of `engine.test.js` in W3b, in its `test/` folder since X4); the routing on its own, with no signal, in its library (`libs/mixer/test/routing.test.js`).

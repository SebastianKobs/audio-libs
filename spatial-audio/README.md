# spatial-audio

Hearing by distance: how a sound is heard from where you listen, its level, its top, its room and its side, on the places of [`libs/spatial/`](../spatial/README.md). A **voice** is what sounds; an **emitter** is where it sounds from: a place, and how long it's needed. An emitter hands on what it hears there as values, and its caller sets them where it will: a track's controllers, a mixer's strip, a note's own stages. Nothing here makes a Web Audio node, and nothing knows the voices: many can sound from one emitter, each can have its own, or a sound can have none. A package of its own since H4, drawn out of the sound system's space, decided in H0. It imports only `libs/spatial/`, and `libs/util/`'s `smoothstep()` (H6).

It knows no clock and nothing of the world it's in. The listener is yours: a distance to where you listen, and a side, −1 to 1. So a world that wraps round, or has height, stays yours.

```ts
import { Space } from './index.ts';
const space = new Space({
  listener: { distance: ({ x, z }) => Math.hypot(x - me.x, z - me.z), side: ({ x }) => Math.max(-1, Math.min(1, (x - me.x) / 12)) },
  settings: { range: 8, hearing: 40, falloff: 1, dull: 1, room: 1, limit: Infinity, width: 0.6 },   // read live: getters work
});
const at = space.emitter({ x, y: 0, z }, { hears: (name, value, when) => send(name, value, when), keep: true });   // cutoff, level, side, room, now
at.moveTo({ x, y: 0, z }, t);                              // a note's place, from its time: what it hears there handed on { at: t }
at.follow(delaySend, (heard) => amount * heard.room, t);   // a value of yours, set by your law from what it hears
onTick((t) => space.update(t));                            // the emitter follows you, handing on glides { glide: 0.08 }
```

| | |
|---|---|
| `new Space({ settings, listener })` | the space (`space.ts`). `listener`: `distance(position)`, `side(position)`. `settings`, read live: `range`, `hearing`, `falloff`, `dull`, `room`, `limit` (the model, below), and `width`, how far a sound is panned at most |
| `hearing(d)`, `hearMax()` | how a sound is heard at distance `d`, `{ level, cutoff, room }` (`Heard`), and where nothing is heard any more |
| `side(position)` | how far a sound from a place is panned: the listener's side of it times `width` |
| `emitter(position, { hears, until, keep, onLetGo })` | an `Emitter` (`emitter.ts`), its place a `Place<Heard>`, the space's to follow; `position`, `until`, `heard`, `close(at)`. Kept (`keep`), it's never let go; else let go once past `until`, doing what `onLetGo` asks |
| `hears(name, value, when)` | what an emitter hears, handed on: `'cutoff'` (Hz), `'level'`, `'side'` (−1 to 1, times `width`) and `'room'`; `when` (`libs/automation/`'s `When`, DRY4; `libs/util/`'s until LAY1) `{}` for now, your now, `{ at }` from a time of yours, or `{ glide }` gliding there from now by a time constant; `timedAt()` makes it a value at a time. In one order: its cutoff, its level, its side where it's given, its room, then its followers. Now as it's made; at a note's time (`moveTo(position, at, side)`, `side` a position to pan from, where it's going unless you say); gliding as you move, its side left where its note put it |
| `follow(follower, law, at)` | a value of yours set from what an emitter hears by its law, handed to the follower with the same `when`s, from `at` (now, with none); with no law, let go: handed on as 0, then left |
| `emitters` | the live list, the same array for as long as it runs |
| `update(t)` | on every tick: lets go of the emitters past their time, and glides the rest to where they're heard now (0.08 s), when the change is big enough to hear |
| `shift(offset)` | moves every emitter, when you move your world under the listener (a floating origin, a wrap) |

**Its emitters' places, and positions,** are [`libs/spatial/`](../spatial/README.md)'s: the space's emitters are on a `Places<Heard>`, perceived by the model below and `moved()`, each emitter's place a `Place<Heard>`.

**The model** (`model.ts`, pure), like sound outdoors:
- Within the range everything plays at full level.
- Beyond it, the direct sound drops 6 dB for every doubling of distance at `falloff` 1. That's Web Audio's inverse distance model, from the range.
- It loses its top: the cutoff halves every 6 units at `dull` 1.
- The room, its send to the reverb, fades half as fast at `room` 1, so far sounds are mostly room.
- It fades out from 80% of `hearing` to `hearing`, which is never inside the range and never past `limit`.
- No lag with distance, and no Doppler: a lag would push far notes off the beat. Left and right only.
- A change is handed on once the level or room is 0.002 off, or the cutoff 1% (`moved()`).

**Its user in the app:** the garden's space, its view the listener (`garden/model/hearing.ts`), ticked once the audio has started; each replay track's emitter, its values sent as the track's controllers (`garden/model/messages/replay-track.ts`).

Tested in node (`test/spatial-audio.test.js`): the model against `shared/test-vectors/space/hearing.json`, and the space and its emitters, what each hears handed on as values, with a listener of the test's own. The garden's settings reaching the model and its tick are the garden's tests (`mockup/test/unit/hearing.test.js`); what the garden plays from it is held to the recordings (`shared/test-vectors/instruments/`, `shared/test-vectors/sequencer/`).

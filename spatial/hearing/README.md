# spatial/hearing

Hearing by distance: how a sound is heard from where you listen, its level, its top, its room and its side, on the places of `spatial/places/`. A voice is what sounds; an emitter is where it sounds from: a place, and how long it's needed. An emitter hands on what it hears there as values, and its caller sets them where it will: a track's controllers, a strip, a note's own stages. Values only: no Web Audio.

Depends on: `base/automation`, `base/util`, `spatial/places`.

Nothing here makes a Web Audio node, knows a clock or knows the voices: many can sound from one emitter, each can have its own, or a sound can have none. The listener is the caller's: a distance to where you listen, and a side, −1 to 1. So a world that wraps round, or has height, stays the caller's.

```ts
import { Space } from './index.ts';
const space = new Space({
  listener: { distance: ({ x, z }) => Math.hypot(x - me.x, z - me.z), side: ({ x }) => Math.max(-1, Math.min(1, (x - me.x) / 12)) },
  settings: { range: 8, hearing: 40, falloff: 1, dull: 1, room: 1, limit: Infinity, width: 0.6 }, // read live: getters work
});
const at = space.emitter({ x, y: 0, z }, { hears: (name, value, when) => send(name, value, when), keep: true }); // cutoff, level, side, room, now
at.moveTo({ x, y: 0, z }, t); // a note's place, from its time: what it hears there handed on { at: t }
at.follow(delaySend, (heard) => amount * heard.room, t); // a value of yours, set by your law from what it hears
onTick((t) => space.update(t)); // the emitter follows you, handing on glides { glide: 0.08 }
```

How a sound is heard, like sound outdoors (`hearing.ts`, pure):

1. Within the `range` everything plays at full level.
2. Beyond it, the direct sound drops 6 dB for every doubling of distance at `falloff` 1: Web Audio's inverse distance model, from the range.
3. It loses its top: the cutoff halves every 6 units at `dull` 1.
4. The room, its send to the reverb, fades half as fast at `room` 1, so far sounds are mostly room.
5. It fades out from 80% of `hearing` to `hearing`, which is never inside the range and never past `limit`.
6. There is no lag with distance and no Doppler: a lag would push far notes off the beat. Left and right only.
7. A change is handed on once the level or room is 0.002 off, or the cutoff 1%.

| Export | What it does |
|---|---|
| `new Space({ settings, listener })`: `hearing()`, `hearMax()`, `side()`, `emitter()`, `emitters`, `update()`, `shift()` | The space. `hearing(d)` is how a sound is heard at distance `d`; `hearMax()` where nothing is heard any more; `side(position)` how far a sound is panned, the listener's side times `width`. `update(t)` is called every tick: it lets go of the emitters past their time and glides the rest to where they're heard now (0.08 s). `shift(offset)` moves every emitter when you move your world under the listener (`space.ts`). |
| `Listener`, `SpaceSettings`, `Heard` | The listener the caller's: `distance(position)` and `side(position)`. The settings are read live: `range`, `hearing`, `falloff`, `dull`, `room`, `limit`. A `Heard` is `{ level, cutoff, room }` (`space.ts`, `hearing.ts`). |
| `new Emitter(…)`: `position`, `until`, `heard`, `close()`, `moveTo()`, `follow()`, `place` | Made by `emitter(position, options)`: its place a `Place<Heard>`, the space's to follow. Kept (`keep`), it's never let go; else let go once past `until`, doing what `onLetGo` asks. `moveTo(position, at, side)` hands on what it hears there at a note's time, `side` a position to pan from, where it's going unless you say (`emitter.ts`). |
| `EmitterOptions`, `Hears`, `HeardValue` | What an emitter is made with: where what it hears goes, how long it's needed, what's done as it's let go. `hears(name, value, when)` gets `'cutoff'` (Hz), `'level'`, `'side'` (−1 to 1, times `width`) and `'room'`, in that order, then its followers (`emitter.ts`). |
| `Law`, `Follower` | `follow(follower, law, at)` sets a value of yours from what an emitter hears by its law, from `at`; with no law, it's handed on as 0, then left. A follower gets the value and its `when` (`emitter.ts`). |

A `when` is `base/automation/`'s `When`: `{}` for now, `{ at }` from a time of yours, or `{ glide }` gliding there from now by a time constant. Values are handed on now as an emitter is made, at a note's time, and gliding as you move, its side left where its note put it.

Tests: `test/hearing.test.js`, the model against `test-vectors/space/hearing.json`, and the space and its emitters, what each hears handed on as values, with a listener of the test's own.

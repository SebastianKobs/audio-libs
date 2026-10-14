# libs/spatial-audio

Where a sound comes from, and how it's heard from where you listen. A **voice** is what sounds: one note on an instrument (`libs/synth/`). An **emitter** is where it sounds from: a place, and how long it's needed. It builds nothing: it hands on what it hears there as values, its cutoff, its level, its side and its room, and its caller sets them where it will, the garden as a track's controllers. Nothing here makes a Web Audio node. Neither knows the voice. Many voices can be heard from one (a phrase), each can have its own, or a sound can have none.

It knows no clock and nothing of the world it's in. The listener is yours: a distance to where you listen, and a side, −1 to 1. So a world that wraps round, or has height, stays yours.

```ts
import { Space } from './index.ts';
const space = new Space({
  listener: { distance: ({ x, z }) => Math.hypot(x - me.x, z - me.z), side: ({ x }) => Math.max(-1, Math.min(1, (x - me.x) / 12)) },
  settings: { range: 8, hearing: 40, falloff: 1, dull: 1, room: 1, limit: Infinity, width: 0.6 },   // read live: getters work
});
const at = space.emitter({ x, y: 0, z }, { hears: (name, value, when) => send(name, value, when), keep: true });   // cutoff, level, side, room
at.moveTo({ x, y: 0, z }, t);                        // a note's place, from its time: what it hears there handed on { at: t }
at.follow(delaySend, (heard) => amount * echo(heard), t);   // a value of yours, set by your law from what it hears
onTick(t => space.update(t));                        // once the audio runs: the emitter follows you, handing on glides { glide: 0.08 }
```

| | |
|---|---|
| `new Space({ settings, listener })` | the space (`space.ts`), made before the audio starts, the model working from then (the garden makes its own as it's made, `gardenSpace()`, G0h3). `listener`: `distance(x, z)`, `side(x, z)`. `settings`, read live: `range`, `hearing`, `falloff`, `dull`, `room`, `limit` (the model, below), and `width`, how far a sound is panned at most |
| `hearing(d)`, `hearMax()` | how a sound is heard at distance `d`, `{ g, fc, room }`, and where nothing is heard any more |
| `emitter(position, { hears, until, keep, onLetGo })` | an `Emitter` (`emitter.ts`), `{ place, position, until, heard, close(at) }`, its place a `Place<Heard>`, the space's to follow (below, Y1). It builds nothing: it hands on what it hears to `hears(name, value, when)`, each value by its name, `'cutoff'` (Hz), `'level'`, `'side'` (−1 to 1, times `width`) and `'room'`, and `when` `{}` for now, `{ at }` from a time of yours or `{ glide }` gliding there by a time constant: now as it's made, at a note's time (`moveTo(position, at, side)`, `side` a position to pan from) and gliding as you move. Kept (`keep`), it's never let go: a replay track's. Each value you have it follow (`follow(follower, law, at)`) is set by its law from what it hears and handed to the follower, with the same `when`s: a track's delay send by the echo law. Let go, it does what `onLetGo` asks. The garden maps the values to its track's controllers (`garden-surface/messages/replay-track.ts`) |
| `emitters` | the live list, the same array for as long as it runs |
| a note's own stages | the instrument's since V3, set by the per-note controllers the garden's emitter sent what it set as (`NoteStages`, `HEARD_PER_NOTE`, `ROOM_PER_NOTE`, `libs/web-audio-synth/note-stages.ts`; `note-stages.ts` here, G0b, until V3); the garden sends none since N2, your notes on pools of tracks, each track's emitter setting its strip's stages, as a replay track's |
| `side(position)` | how far a sound from a place is panned: the listener's side of it times `width`; what a voice placed by its x was panned by until V5 |
| `update(t)` | on every tick: lets go of the emitters past their time, and glides the rest to where they're heard now (0.08 s), when the change is big enough to hear |
| `shift(offset)` | moves every emitter, when you move your world under the listener (a floating origin, a wrap) |

**Its emitters' places, and positions,** are the spatial part's, a library of its own since Y2 ([`libs/spatial/`](../../libs/spatial/README.md)), drawn out of the space in Y1: the space's emitters are on a `Places<Heard>`, perceived by the model below and `moved()`, each emitter's place a `Place<Heard>`.

**The model** (`model.ts`, pure, no Web Audio), like sound outdoors:
- Within the range everything plays at full level.
- Beyond it, the direct sound drops 6 dB for every doubling of distance at `falloff` 1. That's Web Audio's inverse distance model, from the range.
- It loses its top: the cutoff halves every 6 units at `dull` 1.
- The room, its send to the reverb, fades half as fast at `room` 1, so far sounds are mostly room.
- It fades out from 80% of `hearing` to `hearing`, which is never inside the range and never past `limit`.
- No lag with distance, and no Doppler: a lag would push far notes off the beat. Left and right only.
- A change is sent once the level or room is 0.002 off, or the cutoff 1% (`moved()`).

Tested in node (`mockup/test/unit/space.test.js`; the spatial part in its library, on places of its own, perceived as a distance): the model against `shared/test-vectors/space/hearing.json`, kept for the Flutter app, and the emitters, what each hears handed on as values. What the garden plays from them is held to the recordings (`shared/test-vectors/instruments/`).

# libs/sequencer

Patterns played on the grid, after Ableton's session view, for events of any kind. A **pattern** is a clip: `{ meter, bars, loop, events }`, its time signature (the master's when it's left out), its length in bars, whether it loops, and its events, each `{ start, duration, … }` in ticks, 96 to a quarter (`PPQ`), on the straight grid. A rest isn't stored: it's the gap between events. A pattern's events are any events (`PatternEvent`, `Pattern<Event>`): where each starts and how long it lasts, whatever else it carries passed on, never read. What's played is kept as a **record**, which is a pattern too. Pure: no Web Audio, nothing of the app's, on the clock alone (`libs/clock/`); the MIDI sequencer, notes and their messages, the input, the stream, the recorder and the recording player, is on top of it (`libs/midi-sequencer/README.md`). Its tests in its `test/` folder. It's given the clock's grid as functions, so a replay is always the same. Why it's built so: `mockup/architecture/sequencer.md`.

```js
import { ClipLauncher, TrackPool, patternOf, upcoming } from './index.ts';
const next = upcoming(patternOf(flower.seq, cycle), at, 3);             // a record's next three events from a place, round the loop
const track = pool.place(flower, from, until);                          // a play on a pool's track, its index (a TrackPool)
const lights = new ClipLauncher({ grid, play: (track, cue, at) => light(track, cue.color, at) });
lights.launch({ track: 'lamp', pattern: cues });                         // a clip of cues looping on its track
lights.step(i, t);                                                       // each 16th: every clip's events due there handed on
```

| | |
|---|---|
| `lengthOf(pat, meter)` | a pattern's length in ticks, `libs/clock/`'s (`PPQ`, `STEP`, `barTicks()`, `startsBar()`, the clock's since DRY2) |
| `patternOf(record, cycle)` | a record as the pattern it is: from the one of its first bar, whole cycles long, looping where it was played (`from`) |
| `upcoming(pat, at, n)` | a looping pattern's next events from a place, round the loop |
| `whole(pat, at)` | a pattern played whole, as a launched clip: from its first event to its last, once, its first in the beat at `at`, each event in its place in the beat as kept, so its swing and offbeats stay; its place in the bar moves by whole beats |
| `due(pat, i)` | what a repeating pattern plays in the grid's 16th `i` |
| `liveEvents(pat, start, scale, from, to)` | a rhythm played live from where it started, at half, normal or double time (`scale`), its events between two places |
| `rescaled()` | where a rhythm would have started at another speed, so it runs on with no jump |
| `underWayAt(pat, start, scale, at)` | the event under way at a place, for a soloist coming in mid-note |
| `place(base, start, grid, from)`, `placeOn(…)` | place → clock time: from the beat it starts on (`'beat'`), or at its phrase's own place in the beat (`'phrase'`), so the swing falls on the same events. `grid`: `{ stepAt, timeAt }`. `placeOn()` the place on the grid in 16ths instead, for a phrase sent as its events come due, each timed then (P3c2) |
| `new ClipLauncher({ grid, play, started, ended })` (`launcher.ts`), `launch(clip)`, `stop(track)`, `step(i, t)` | clips of events of any kind launched on tracks, one a track, each looping on the beat grid, or played once (`once`) from the next beat, its first event to its last, each in its place in the beat as kept (`whole()`), since SHAPE2a0b; each 16th, every clip's events due there handed on (`play(track, event, at, launch)`) at the clock times they fall at, on the swing or straight under it, an event's own `straight` before its clip's, an event off its 16th where it falls; each launch numbered, a clip launched again in a track's place keeping it; a clip played once told as it starts, its span from its first event's time to its last's end (`started(track, launch, { from, until })`), and as its last is handed on (`ended(track, launch)`), not when it's launched over or stopped; a track any value its owner keys clips by |

**Track pools** (`track-pool.ts`): `new TrackPool()` gives a pool of tracks, overlapping plays allotted to them as a polysynth allots its voices, a kind's replays' in the garden, and your playing's since N2, `{ tracks, place(owner, from, until, { join }), end(index, until) }`. `place()` puts a play on a track and returns its index: the track its owner played on last if that's free, else the lowest free one, else a new one. A track is free once the play it holds has died away (`until`), so it plays one at a time; `end()` ends a placement held open (`until` never) once its end is known, a held note let go (N2); a play may `join` its owner's track while the owner still holds it, as notes from one place share a voice, the track held until the later end (N5), how long a track is held a `Holding` (`holding.ts`), never while a play on it is held open, else the latest end; tracks are never taken away.

Tested in node, in its `test/` folder (`test/sequencer.test.js`, `track-pool.test.js`, `launcher.test.js`, the launcher's on a light's cues, not notes, looping and played once); the garden's phrasing, what isn't a sequencer's, in its own README (`garden-surface/phrasing/README.md`); what the garden plays through it is held to the replays' recordings (`shared/test-vectors/replays/`).

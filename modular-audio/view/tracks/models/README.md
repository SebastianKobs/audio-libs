# modular-audio/view/tracks/models

The session view's and the arrangement's view models, no DOM: handed what they read through the readouts and the desk's view models, they hand back what a view shows and what it can do, as MVVM's view models do. Rows, regions and lanes in time, the clip tracks and what each track plays now are among them.

Depends on: `base/automation`, `base/params`, `base/util`, `modular-audio/plan/desk`, `modular-audio/view/desk/models`, `modular-audio/view/tracks/readout`, `sequencing/clock`.

```ts
import type { ClipsReadout } from '../readout/index.ts';
import { ClipTracks, Views } from './index.ts';

const views = new Views();
views.onShow((view) => console.log(view)); // 'session', 'arrangement' or null
views.tab('session', true); // the session view's tab opened; views.shown is 'session'

declare const surface: ClipsReadout;
declare const clock: { now(): number };
const clips = new ClipTracks({ surface, clock, launch: () => {}, remove: () => {} });
clips.tracks; // a clip track for each of the control surface's
clips.drop(slot); // a clip's ×: the first click asks, a second a moment later, within 3 s, deletes
```

A clip's × is a deliberate, confirmed action:

1. The first click asks, "delete?".
2. A second click on it, after a moment (0.4 s) and within 3 s, deletes the clip.
3. Anything else, or nothing for 3 s, stops asking.

| Export | What it does |
|---|---|
| `new ClipTracks({ surface, clock, launch, remove })`: `tracks`, `asking`, `clipsOn()`, `launch()`, `drop()`, `stopAsking()`, `expire()` | The clip tracks as a session view shows them. `clipsOn(track)` reads a track's clips from what holds them, in the order held, each once; a clip's ▶ launches it and its × asks first (`clip-tracks.ts`). |
| `ShownClip` | A clip on its clip track: its slot, its name, how many notes it holds and whether it plays (`clip-tracks.ts`). |
| `new Session(tracks)`: `heard()`, `at()`, `kept()` | What the session view shows of what's played, read in its own words, the MIDI sequencer's stream fitting them by their shape. `heard(play)` keeps a play on its group of tracks; `at(now, since)` is a look: each track's holder and whether it sounded since, or the play waiting for its first note (`session.ts`). |
| `TrackShown`, `GroupShown` | A track as a look shows it, what holds it and whether it sounded since or what waits for it; a group as a look shows it, its tracks and the clips that sounded since the last look (`session.ts`). |
| `new SessionTracks({ tracks, trackAt })`: `groups()`, `sounded()` | The session's tracks as its desk shows them, from a look at the session in the control surface's groups: the tracks with notes, those played live marked, each named from its group and numbered from 1, at its channel's address on the desk. `sounded()` is what sounded since the last look, for the folded sections' lights (`session-tracks.ts`). |
| `new Views()`: `shown`, `tab()`, `onShow()` | The session view and the arrangement, which one is open or none, a tab each opening and closing it; whoever listens is told as it changes (`views.ts`). |
| `ViewName` | A view, its tab's name: `session` or `arrangement` (`views.ts`). |
| `new Arrangement({ recording, transport, declared, tracks, desk, instruments, sections, clock, cue })`: `rows`, `regions`, `lanes`, `playhead`, `following`, `left`, `right`, `now`, `map`, `show()`, `frame()`, `look()`, `toggleLanes()`, `toggleGroup()`, `press()`, `placeAt()`, `release()`, `scrollBy()` | What was heard laid out in time, as Ableton's arrangement, in 16ths and rows, the pixels its drawer's. Its rows, regions and opened lanes are kept as they were heard, and it looks again on every beat while it shows (`arrangement/arrangement.ts`). |
| `PlacedRegion`, `PlacedLane` | A region on its row: labeled by its clip, played live or not, grayed once its clip is gone, in song time. An opened lane on its row is on its param's range as the desk declares it, a MIDI device's in a color of its own (`arrangement/regions.ts`). |
| `Row`, `ArrangedStrip`, `SectionLabels` | One row: a header that folds its group, a track (open once it has lanes), or a lane named by its controller. The desk's strips and the instruments with no notes of their own are arranged by the session view's sections (`arrangement/rows.ts`). |
| `declaredBy(views)` | What the desk declares, read from its view models: a lane's param by its strip and its controller there, and a strip's controllers in the order the sound goes through it (`arrangement/declared.ts`). |
| `noteShape()`, `pitchRange()`, `NoteShape` | A region's notes as drawn: a note's pieces, glides and slide; and a region's pitch range, its notes' lowest to highest (`arrangement/note-shapes.ts`). |
| `laneLine()`, `Corner` | A lane's line, its points played as automation, a glide's curve sampled until it settles; a `Corner` is a value at a time (`arrangement/lane-shapes.ts`). |

`placed.ts` works out where a play goes, its group of tracks and its track, for the session and the arrangement alike.

The arrangement keeps each group folded to its first track until it's unfolded, and a track's lanes under it once they're opened. Each `frame()` moves the time in view, following the present or the playhead while it plays back, until it's scrolled back. A press in the ruler places the playhead on the nearest beat, and its release cues it.

Tests: `test/clip-tracks.test.js`, `test/session.test.js`, `test/session-tracks.test.js`, `test/views.test.js`, and the arrangement a file a topic: `test/arrangement.test.js`, `test/arrangement-rows.test.js`, `test/arrangement-time-window.test.js`, `test/arrangement-playhead.test.js`, `test/arrangement-note-shapes.test.js`, `test/arrangement-lane-shapes.test.js` and `test/arrangement-declared.test.js`, on its fixtures in `test/arrangement.js`.

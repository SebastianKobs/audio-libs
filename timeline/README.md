# libs/timeline

What happened, laid out in time, and played back, for events of any kind: the generic part of an arrangement, as Premiere's or Ableton's. A package of its own since L1c, down to events since L1c2, played back since L1d (`mockup/architecture/done.md`): it knows of an event only when it starts and how long it lasts. Regions, lanes, a note's index, Web Audio's glide curve and putting lanes back after playback are the sequencer's, its own views of the timeline's events and their playback (`libs/midi-sequencer/recorder.ts`, `lanes.ts`, `playback.ts`). It plays in **timeline time**, as Web Animations names it: the time along the timeline, its holds taken out, a stop's or a pause's, so a hold is played past at once; the clock's song time is the timeline time of music, handed in under the timeline's names. It uses only the clock's `Seconds`.

An event's **extent** is one of three: its own length; open until its end is told; or, an event that holds, until the next of its key, as a value set holds until the next one is (a lane's point, a keyframe). Kept for a **window**, the last 30 minutes unless told: an event that ended before it is let go, one still in effect kept, of each key's the one in effect where the window starts.

```js
import { Player, Timeline } from '../timeline/index.ts';
const timeline = new Timeline({ keep: 30 * 60, same: (before, after) => before.value === after.value, onLetGo: (gone) => forget(gone) });
const press = { t: 1, finger: 0 };
timeline.add([press]);                                 // an event with no length: open
timeline.endAt(press, 2);                              // its release: a length, never less than none
timeline.hold('pressure', { t: 1.5, value: 0.4 });     // an event that holds until the next of its key
timeline.settle(now);                                  // what's past the window let go, what holds what's held already thinned
const sounding = timeline.inEffectAt(now);             // what's in effect: under way, open, each key's latest by then
const player = new Player({ performer: { start, point, end, hold }, timeline: { toTimeline, fromTimeline } }); // a hold taken out
player.play({ events: presses, held: [tilt] }, { from: 10, at: now, end: now }); // from the timeline's 10 s, heard from now
clock.onTick((t) => player.due(t + lookahead));        // each moment told as it comes due
```

| | |
|---|---|
| `new Timeline({ keep, same, onLetGo })` (`timeline.ts`) | events kept for a window, the last 30 minutes unless told; `same(before, after)` whether an event that holds holds what the one before it of its key held, none by default; `onLetGo(events)` told what was let go |
| `add(events)`, `endAt(event, t)` | events with their own length, or open, in the order they came, what's past the window let go as they come, at most once a second of their time; an open event's end, its length from its start, never less than none |
| `hold(key, event)`, `keys()`, `held(key)` | an event that holds until the next of its key, among its key's in time order, after those at its time; the keys in the order they began; a key's events |
| `settle(now)`, `events()` | the timeline as of a time: what ended before its window let go, an event that holds what's held already thinned once it's a second past; the events with their own length or open |
| `inEffectAt(t)`, `startingIn(from, to)` | what's in effect at a time, an event from its start until its end, an open one on, each key's latest by then; what starts in a range |
| `new Player({ performer, pointsOf, timeline, endOf })` (`player.ts`), `play({ events, held }, { from, at, end })`, `due(until)`, `stop(t)`, `finish(t)`, `position(now)`, `endsAt()`, `ended(now)` | the timeline played back from its time `from`, heard at clock time `at`, until its `end` as it started: each moment told to the performer as it comes due on a tick, heard as far after where it starts as it lies along the timeline; an event's start (`start(event, t, at)`, `at` its own time it starts from, later than its start where it's under way and chased), its points (`pointsOf()`) and its end, at one time a start before its points, an end after, one over by then or starting at or past the end left out; an event that holds, each key's in time order, told as it comes due (`hold(event, t)`), the one in effect where it starts picked up from there (`hold(event, t, from)`), at one time before what starts there, never ended; stopped, what's under way ended then; played to the end, each under way ringing out to its end as far after it was heard from as it lies along the timeline, an open one ended then; where it plays, past a hold at once, never past the end; `endOf()` where an event ends along the timeline, where it ended by default, never before it starts |
| `TimeMap`, `{ toTimeline(t), fromTimeline(along) }`, `PlayedFrom`, `{ from, at, end }` (`timeline-time.ts`) | a clock time to timeline time and back, the clock's where it's left out; where playback starts |
| `placed(events, event)`, `thinned(events, settled, same, from)` | an event into others in time order, after those at its time, as Web Audio places an event among those at its time; events that change nothing left out once settled, by the caller's equality, the first against where it starts from |

Tested in node, in its `test/` folder, on events of their own, a hand's presses and a pointer's pressure, not notes (`test/timeline.test.js`, `test/player.test.js`); the MIDI sequencer's recorder and recording player on it by their own tests (`libs/midi-sequencer/test/recorder.test.js`, `playback.test.js`, `lane-playback.test.js`).

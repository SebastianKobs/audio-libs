# libs/timeline

What happened, laid out in time, for events of any kind: the generic part of an arrangement, as Premiere's or Ableton's. A package of its own since L1c, down to events since L1c2 (`mockup/architecture/plan.md`): it knows of an event only when it starts and how long it lasts. Regions, lanes, a note's index and Web Audio's glide curve are the sequencer's, its own views of the timeline's events (`sound/sequencer/recorder.ts`, `lanes.ts`). It uses only the clock's `Seconds`.

An event's **extent** is one of three: its own length; open until its end is told; or, an event that holds, until the next of its key, as a value set holds until the next one is (a lane's point, a keyframe). Kept for a **window**, the last 30 minutes unless told: an event that ended before it is let go, one still in effect kept, of each key's the one in effect where the window starts.

```js
import { Timeline } from '../timeline/index.ts';
const timeline = new Timeline({ keep: 30 * 60, same: (before, after) => before.value === after.value, onLetGo: (gone) => forget(gone) });
const press = { t: 1, finger: 0 };
timeline.add([press]);                                 // an event with no length: open
timeline.endAt(press, 2);                              // its release: a length, never less than none
timeline.hold('pressure', { t: 1.5, value: 0.4 });     // an event that holds until the next of its key
timeline.settle(now);                                  // what's past the window let go, what holds what's held already thinned
const sounding = timeline.inEffectAt(now);             // what's in effect: under way, open, each key's latest by then
```

| | |
|---|---|
| `new Timeline({ keep, same, onLetGo })` (`timeline.ts`) | events kept for a window, the last 30 minutes unless told; `same(before, after)` whether an event that holds holds what the one before it of its key held, none by default; `onLetGo(events)` told what was let go |
| `add(events)`, `endAt(event, t)` | events with their own length, or open, in the order they came, what's past the window let go as they come, at most once a second of their time; an open event's end, its length from its start, never less than none |
| `hold(key, event)`, `keys()`, `held(key)` | an event that holds until the next of its key, among its key's in time order, after those at its time; the keys in the order they began; a key's events |
| `settle(now)`, `events()` | the timeline as of a time: what ended before its window let go, an event that holds what's held already thinned once it's a second past; the events with their own length or open |
| `inEffectAt(t)`, `startingIn(from, to)` | what's in effect at a time, an event from its start until its end, an open one on, each key's latest by then; what starts in a range |
| `placed(events, event)`, `thinned(events, settled, same, from)` | an event into others in time order, after those at its time, as Web Audio places an event among those at its time; events that change nothing left out once settled, by the caller's equality, the first against where it starts from |

Tested in node, in its `test/` folder, on events of their own, a hand's presses and a pointer's pressure, not notes (`test/timeline.test.js`); the sequencer's recorder on it by its own tests (`mockup/test/unit/recorder.test.js`).

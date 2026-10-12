# libs/timeline

What happened, laid out in time: the generic part of an arrangement, as Premiere's or Ableton's, for events of any kind. A package of its own since L1c (`mockup/architecture/plan.md`), split out of the sequencer's recorder, which is now the music's mapping onto it (`sound/sequencer/recorder.ts`): a play's notes its events, a note's index what its end, glides and changes name it by. It uses only the clock's `Seconds`.

```js
import { EventRecorder, valueAt } from '../timeline/index.ts';
const recorder = new EventRecorder({ keep: 30 * 60 });                      // the last 30 minutes
recorder.record(hand, stroke, { by: 'a hand' }, [{ t: 1, finger: 0 }]);   // a stroke's presses, its region by its number; one with no length held open
recorder.endAt(recorder.openEventOf(hand, (press) => press.finger === 0), 2); // its release: a length, never less than none
recorder.placeOnLane({ pointer: 0, what: 'pressure' }, { t: 1.5, value: 0.4, glide: 0.05 }); // a lane by an id of its own
const regions = recorder.regions(now);                                     // each with its element, number, header, events, from and to
const pressure = valueAt(recorder.lanes(now)[0].points, now);               // where a lane is at a time, its glides followed
```

| | |
|---|---|
| `new EventRecorder({ keep, carry, startOf })` (`recorder.ts`) | regions of events and lanes, kept for a window, the last 30 minutes unless told; `carry(event, at)` how an event still open is carried into its element's next region, as it is by default, its own lanes staying with the one ended; `startOf(event, lane)` where an event's own lane starts, which its first point is thinned against |
| `record(element, number, header, events)` | an element's events into its region by its number, or a new one, those still open in its other numbered regions ended where it begins and carried into it after its own; with no number, a region of its own; the header what began it, kept from its first; the recorder's own copies, which it changes |
| `openEventOf(element, match)`, `latestEventOf(element, match)`, `endAt(event, t)` | an element's latest open event that matches, from its latest region back, the first open there, and its latest, open or not; an open event's end, its length from its start, never less than none |
| `placeOnEvent(event, lane, point)`, `placeOnLane(id, point)` | a point on an event's own lane, by its name, or on a lane by an id of the caller's, made the first time a point comes for it, among those there in time order, after those at its time, as Web Audio places an event |
| `regions(now)`, `lanes(now)` | the regions, each from its first event to the end of its last, an open one's never, and the lanes, `{ ...id, points }`, in the order they began; what's before the window let go, an event ended before it and a region with none, a lane's points but its last; a point that changes nothing, a jump to the same value or a glide to it by the same time constant, thinned once it's a second past |
| `valueAt(points, t)`, `lastValueAt(points, t)` (`lanes.ts`) | a lane's value at a time, a jump's value, a glide's where it had got to by its time constant, as Web Audio's `setTargetAtTime` goes; its last point's value by then, its curve not followed; none before its first |

Tested in node, in its `test/` folder, on events of their own, a hand's presses and a pointer's pressure, not notes (`test/recorder.test.js`, `test/lanes.test.js`); the sequencer's recorder on it by its own tests (`mockup/test/unit/recorder.test.js`).

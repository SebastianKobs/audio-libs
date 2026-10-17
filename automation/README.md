# automation

What a param is told as it plays, and its level at a time. A package of its own since LAY1, at the bottom beside `util/`: a plan is timeless, so what moves a param over time is shared by whoever tells it or reads it: the synth and the engine, the mixer, MIDI's controllers, the sequencer's lanes, the views that draw them.

Its words are Web Audio's: automation as an `AudioParam` schedules it, `setTargetAtTime()`'s time constant among it. `levelAt()` works Web Audio's curves out in plain code, what another engine's automation would have to match.

```ts
import { automationOf, levelAt, Levels } from './index.ts';
levelAt([['set', 0, 0], ['linear', 1, 2]], 1);              // 0.5: halfway up the ramp
const lane = automationOf([{ value: 0, t: 0 }, { value: 1, t: 1, glide: 0.5 }]);
const levels = new Levels(lane);                           // one walk for many rising times
levels.before(1);                                          // 0: coming up to the glide
levels.at(1.5);                                            // 1 − 1/e: a time constant into it
```

| | |
|---|---|
| `Automation` | a param's automation, as Web Audio's events: `['value', v]` as the node is made, `['set' \| 'linear' \| 'exp', v, at]`, `['target', v, at, tc]`, `['cancel', at]`; times in seconds from the start of whatever plays it (`automation.ts`) |
| `eventTime(event)`, `restartAt(level, at)`, `shiftedBy(automation, seconds)`, `scheduled(automation, told)` | when an event is, a value before anything; a param restarted at a time, what was planned from then cancelled, set there to a level; automation later by a time; automation as Web Audio holds it once told more, a cancel dropping what was planned from its time, the rest in time order (`automation.ts`) |
| `continuedAs(playing, wanted, at, smoothing)`, `cutAt()`, `eventsAfter()`, `onTheWay()`, `approachAt()`, `SMOOTHING` | automation continued as another from a time, as a knob turned while a param plays: from where it is then, a ramp running then cut there at the level it has reached, as Web Audio drops a ramp whose end is cancelled (`cutAt()`, an envelope's release's before, LAY14a5a), a ramp coming taking it on, a target approached from there, timed to meet an event coming that cuts it on its way, as a comparator cuts an attack, so nothing jumps there (LAY14a6), a held value glided to by the smoothing, 0.05 s unless asked, as a plugin smooths a knob against zipper noise; an envelope's, an edit's (`continued.ts`, from `libs/audio-plan/` in LAY14a1a) |
| `levelAt(automation, t)` | a param's level at a time as Web Audio plays it: set at once; a ramp, straight or exponential, from where the event before left it, an exponential one from or to nothing holding, then jumping at its end; a target approached from its start by its time constant (`level-at.ts`) |
| `fadedFrom(automation, floor)` | when a param's level falls within a floor for good: its last event's time where that leaves it within it, a target's once it comes within it, never where it ends above it; an envelope's, so a voice's owner knows when it has rung out (`level-at.ts`, LAY14a2) |
| `Levels` | the same at rising times, its automation walked once, as a line is drawn: `at(t)`, every event by then done; `before(t)`, coming up to a time, a jump there not yet made, its foot (`level-at.ts`) |
| `TimedValue`, `timedValue(value, t, glide)` | one change: a value at a time, jumping there, or gliding there from its time by a time constant, as an automation point's curve; MIDI's controllers, a lane's points and the desk's changes are one (`timed-value.ts`) |
| `When`, `timedAt(value, when, now)` | when a value lands, by a caller that knows no clock: now, `{ at }` from a time of the caller's, or `{ glide }` gliding there from now, or from `at` with both; made a value at a time by the caller's now (`timed-value.ts`) |
| `eventOf(change)`, `automationOf(changes)` | a change as an automation event, a jump set at its time, a glide a target, a glide of 0 a jump; changes in time order as automation, the first set at its time, nothing before it to glide from (`timed-value.ts`) |

Tested in node, in its `test/` folder, automation later, continued and held as Web Audio does among it (`test/automation.test.js`); the lanes' values by the MIDI sequencer's tests, their lines by the arrangement's.

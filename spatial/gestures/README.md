# gestures

The gesture tracker: pointer input in, gestures out, as events. Taps, holds, drags, loops, two-finger pans and a stroke's shape, read on the screen so perspective doesn't change them, and the zones a stroke crosses on the floor, as its user hands them in. No DOM: a page hands it each pointer's input. It uses the clock (`libs/sequencing/clock/`, its time and its ticks), places (`libs/spatial/places/`, a floor point and a box) and `libs/base/util/`.

```ts
import { GestureTracker, TRACKER_DEFAULTS } from './index.ts';

const tracker = new GestureTracker({ settings: { ...TRACKER_DEFAULTS }, clock });
tracker.configure({ height: 900, zoneAt: (g) => Math.floor(g.z) }); // the screen's height; a zone under a floor point
tracker.on('tap', (event) => grow(event.g));
tracker.on('zone', ({ zone, prev }) => step(zone, prev));
tracker.down({ id: 1, button: 0, x: 400, y: 300, t: clock.now(), g: { x: 4, z: 0 } });
```

| | |
|---|---|
| `new GestureTracker({ settings, clock })` | the tracker, on a clock and the settings it reads live; its tick listener kept until `dispose()` (`tracker.ts`) |
| `down(input)`, `move(input)`, `up(input)`, `cancel(id, t)`, `cancelAll(t)`, `PointerInput` | each pointer's input, as the page hands it: its id, its button (down only), screen `x`, `y`, its own time `t` on the clock's timeline, the floor point `g` under it, or null; cancelled as when a tab is hidden (`tracker.ts`, `pointers.ts`) |
| `on(type, listener)`, `GestureEvent`, `GestureEvents` | its events, each with the pointer's `id`, `t`, `x`, `y`, `g` and `state`: `press`, `hold`, `dragstart`, `dragmove`, `turn { kind, angle }`, `shape { shape, prev }`, `zone { zone, prev }`, `rest`, `move`, `loop { centre, size }`, `tap`, `release`, `cancel`, `panstart`, `panmove`, `panend`, `takeback`; a function back that stops listening (`events.ts`) |
| `configure({ height, zoneAt })` | what's handed in: the screen's height in px, 900 until handed; the zone under a floor point, a number its user gives, none until handed (`pointers.ts`) |
| `tracking(id)`, `inGesture()`, `shapeOf(id)`, `speedOf(id)`, `restingFor(id)` | what an event can't carry: whether a pointer is down; whether a press is in progress, not a pan; a drag's shape now; its hand's speed in screen heights a second, smoothed, none after a press or a rest until a move gives it; how long a drag has been still (`tracker.ts`) |
| `TrackerSettings`, `TRACKER_DEFAULTS` | what it reads live and starts with: the drag threshold, the hold's delay, the hand's smoothing, two fingers' window; a stroke's span, corners, bends and curves; what makes a loop; a user's settings may extend them (`settings.ts`) |

A pointer's state: pressed, then dragging (looping once it winds into a circle) or holding; the right button panning; a second finger within the two-finger window pairing with the first, the two panning, what the first started taken back; a later finger, or a third, ignored. A stroke is sampled every 10 px on the screen (`stroke.ts`); a loop is read from the same samples (`loop.ts`); two fingers are a pair (`pair.ts`).

Tested in node, in its `test/` folder, on a tracker, a clock and settings of its own (`test/gesture-tracker.ts`): held to the vectors in `shared/test-vectors/gestures/`, run by `test/run-gestures.js`, and what they mean, presses, strokes, zones and loops (`test/gesture-tracker.test.js`). Its test strokes, lines, zigzags, waves, arcs, circles and seeded jitter, are in `test/strokes.js`.

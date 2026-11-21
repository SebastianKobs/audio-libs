# spatial/gestures

The gesture tracker: pointer input in, gestures out, as events. Taps, holds, drags, loops, two-finger pans and a stroke's shape, read on the screen so perspective doesn't change them, and the zones a stroke crosses on the floor, as its user hands them in. No DOM: a page hands it each pointer's input.

Depends on: `base/util`, `sequencing/clock`, `spatial/places`.

Its time is the clock's, its ticks and its time; a floor point and a box are places'.

```ts
import { GestureTracker, TRACKER_DEFAULTS } from './index.ts';

const tracker = new GestureTracker({ settings: { ...TRACKER_DEFAULTS }, clock });
tracker.configure({ height: 900, zoneAt: (g) => Math.floor(g.z) }); // the screen's height; a zone under a floor point
tracker.on('tap', (event) => grow(event.g));
tracker.on('zone', ({ zone, prev }) => step(zone, prev));
tracker.down({ id: 1, button: 0, x: 400, y: 300, t: clock.now(), g: { x: 4, z: 0 } });
```

A pointer's state:

1. Pressed, then dragging (looping once it winds into a circle) or holding.
2. The right button pans.
3. A second finger within the two-finger window pairs with the first: the two pan, and what the first started is taken back. A later finger, or a third, is ignored.
4. A stroke is sampled every 10 px on the screen (`stroke.ts`), a loop is read from the same samples (`loop.ts`), and two fingers are a pair (`pair.ts`).

| Export | What it does |
|---|---|
| `new GestureTracker({ settings, clock })`: `dispose()` | The tracker, on a clock and the settings it reads live. Its tick listener is kept until `dispose()` (`tracker.ts`). |
| `GestureTracker`'s input: `down()`, `move()`, `up()`, `cancel()`, `cancelAll()`; `PointerInput` | Each pointer's input, as the page hands it: its `id`, its `button` (down only), screen `x`, `y`, its own time `t` on the clock's timeline, and the floor point `g` under it, or null. `cancel()` is for a tab hidden (`tracker.ts`, `pointers.ts`). |
| `GestureTracker`'s events: `on()`; `GestureEvent`, `GestureEvents` | Its events, a function back that stops listening. Each has the pointer's `id`, `t`, `x`, `y`, `g` and `state`: `press`, `hold`, `dragstart`, `dragmove`, `turn { kind, angle }`, `shape { shape, prev }`, `zone { zone, prev }`, `rest`, `move`, `loop { centre, size }`, `tap`, `release`, `cancel`, `panstart`, `panmove`, `panend`, `takeback` (`events.ts`). |
| `GestureTracker`'s hand-ins: `configure()` | What's handed in: the screen's height in px, 900 until handed; the zone under a floor point, a number its user gives, none until handed (`pointers.ts`). |
| `GestureTracker`'s readings: `tracking()`, `inGesture()`, `shapeOf()`, `speedOf()`, `restingFor()` | What an event can't carry: whether a pointer is down; whether a press is in progress, not a pan; a drag's shape now; its hand's speed in screen heights a second, smoothed, none after a press or a rest until a move gives it; how long a drag has been still (`tracker.ts`). |
| `TrackerSettings`, `TRACKER_DEFAULTS` | What it reads live and starts with: the drag threshold, the hold's delay, the hand's smoothing, two fingers' window; a stroke's span, corners, bends and curves; what makes a loop. A user's settings may extend them (`settings.ts`). |

Tests: `test/gesture-tracker.test.js`, held to the vectors in `test-vectors/gestures/` run by `test/run-gestures.js`, and what they mean: presses, strokes, zones and loops. Its tracker, a clock and settings are `test/gesture-tracker.ts`; its test strokes, lines, zigzags, waves, arcs, circles and seeded jitter, are `test/strokes.js`.

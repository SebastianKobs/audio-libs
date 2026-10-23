# util

Small helpers every library shares, at the bottom of the libraries: it imports nothing.

```ts
import { approach, Events, entryOf, seeded, valueBetween } from './index.ts';

approach(0, 1, 0.1, 0.1); // 1 − 1/e: one time constant of the way to 1
const random = seeded(7); // the same draws for the same seed
const events = new Events<{ beat: [number] }>();
const stop = events.on('beat', (i) => console.log(i));
events.emit('beat', 4); // each listener, in the order they came
entryOf(new Map<string, number[]>(), 'tap', () => []); // made the first time it's asked for
valueBetween([{ t: 0, v: 0 }, { t: 2, v: 4 }], 1, (p) => p.t, (p) => p.v); // 2: a line between the two
```

| | |
|---|---|
| `clamp(value, low, high)`, `clamp01(value)`, `modulo(value, size)` | a value held between two edges, the higher winning where they cross; between 0 and 1; modulo a size, never below 0 (`maths.ts`) |
| `approach(from, target, elapsed, timeConstant)`, `SETTLED` | a value approaching its target by a time constant, as Web Audio's `setTargetAtTime()`, each moment the same share of the way left; 5, the time constants after which it counts as there, within 1 % (`maths.ts`) |
| `stepToward(value, target, elapsed, time)` | a value a frame's step toward its target, a straight share of the way, all of it once `elapsed` reaches `time` (`maths.ts`) |
| `easeOut(v)`, `smoothstep(low, high, value)` | 0 to 1 eased out, cubic; 0 up to the low edge, 1 from the high one, eased between, as GLSL's (`maths.ts`) |
| `wrapAngle(a)`, `wrapToTile(v, size)` | an angle's difference into −π to π; a place into −size/2 to size/2, a thing tiled round a view (`maths.ts`) |
| `firstAfter(items, t, keyOf)`, `lastAtOrBefore(items, t, keyOf)` | in a list rising by its key, by halves: the first later than a time, its index, past them all their length; the last at or before it, none before the first (`search.ts`) |
| `valueBetween(points, time, timeOf, valueOf)` | a value at a time between timed points, a line between each two, held before the first and after the last (`search.ts`) |
| `Seconds` | time as the sound counts it: a clock time, or a length, in seconds (`seconds.ts`) |
| `new DueQueue(timeOf)`: `add(item)`, `takeDue(now)`, `takeBefore(time)`, `items`; `placeInOrder(items, item, timeOf)` | things due at a time, each after those at the same time; those due by now, or before a time, taken out in their order; an item put in time order among others, after those at its time (`due.ts`) |
| `new Events<Arguments>()`: `on(type, listener)`, `emit(type, ...args)` | events by name: a listener for a type, a function back that stops it; each listener called in the order they came, one may stop as it's called (`events.ts`) |
| `new Bus<Sent>()` | messages as values, each to whoever listens to its type, as MIDI's messages are; its messages a union of each library's (`bus.ts`) |
| `entryOf(map, key, make)`, `toggleIn(set, key, on)`, `chainFrom(first, byKey, next)`, `keep(record, ev, cap)` | a map's entry made the first time it's asked for, a `Map`'s or a `WeakMap`'s; a key toggled in a set, or put in or taken out as asked; the keys a chain leads through, each item naming the next, and where it loops; an event kept in a list up to its cap, or null once it's full (`objects.ts`) |
| `updateInPlace(target, from)`, `frozen(data)`, `sameData(one, other)` | an object given another's values in place, all the way down, so what holds a part of it sees the change; data frozen all the way down, a write throwing; data the same as other data, as plain data compares (`objects.ts`) |
| `fromData(data, shape, { source, what })`, `Shape` | data read from a file, YAML's or JSON's, checked for its shape, written as data beside its type: a word, a number, a switch, one of some words, a value of any one of several shapes, a list, a map, an object's fields, closed or not, and what it needs; refused, every problem said under the file's name (`from-data.ts`) |
| `seeded(seed)`, `seedOf(text)`, `pickFrom(list, random)`, `pickWeighted(list, weightOf, random)`, `slice(count, from, rand)` | a generator from a seed, mulberry32, the same seed the same numbers in [0, 1); a seed from a text, FNV-1a, the same text the same seed; an item from a list, each as likely; each as likely as its weight; none from an empty list; a slice of a record of `count` events: `[start, length]`, a random length drawn first, from the start or anywhere (`random.ts`) |
| `keptDraws(random)`, `new Draws({ seed })`: `random()`, `play()`, `reseed(seed)` | draws kept as they're drawn, so a thing made again draws the same, then fresh ones; a source of draws seeded as it's made, its own draws and a play's, a seed of its own drawn from it, seeded again from the start (`random.ts`) |
| `new LiveCopies(from)`: `add()`, `has()`, `of()`, `current()`, `start()`, `set()`, `reset()`, `onSet()` | values kept live by name, as a synth keeps its patches: each a copy of its start, set in place all the way down, read as copies, the live one only for who plays it, each set told (`live-copies.ts`) |
| `Address`, `addressText(address)`, `addressOf(text)`, `under(name, address)`, `isUnder(text, parent)` | where something is, its names on the way down, written with slashes, `desk/channel 3/utility/level`, and back; a parent's name put in front; whether one is under another, as text (`address.ts`) |

Tested in node, in its `test/` folder: the maths, the searches and a value between timed points, due things, events, the bus, the objects' helpers, a chain of keys, a list kept up to its cap, the seeded draws, a slice of a record, live copies and addresses (`test/util.test.js`); data read for its shape (`test/from-data.test.js`). `test/near.js` holds `near()`, a number near another, for every library's tests.

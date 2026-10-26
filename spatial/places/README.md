# spatial/places

Anything placed and perceived from where you are, a sound or not: where it is, how long it's needed, what it's perceived as from a listener that moves, a change told once it matters, and a world that wraps round. What's perceived is its user's: the hearing hears a place as a level, a cutoff and a room (`libs/spatial/hearing/`); a view could see one as a size, or a haptic layer feel one as a strength.

Depends on: `base/util`.

```ts
import { Places, WrapAround } from './index.ts';
const me = { x: 0, y: 0, z: 0 };
const places = new Places({
  perceive: (at) => Math.hypot(at.x - me.x, at.y - me.y, at.z - me.z), // how far: what this user perceives
  changed: (before, now) => Math.abs(before - now) >= 1, // worth telling
});
const thing = { place: places.place({ x: 3, y: 0, z: 4 }, { until: 10 }), perceivedAs: (d) => draw(d), letGo: () => remove() };
places.add(thing);
thing.place.moveTo({ x: 0, y: 0, z: 8 }, 5); // there from 5 on
onTick((t) => places.update(t)); // let go past 10; told as you move
const world = new WrapAround(() => ({ x: 100, y: Infinity, z: 100 }));
world.distance({ x: 10, y: 0, z: 0 }, { x: 95, y: 0, z: 0 }); // 15: the short way round
```

| Export | What it does |
|---|---|
| `Position`, `shifted()` | `{ x, y, z }`: `x` and `z` across, `y` up, as Web Audio and three.js have them. `shifted(position, offset)` is a new one. What perceives a place takes one, and so does the sound's listener (`position.ts`). |
| `FloorPoint`, `Box` | A point `{ x, z }` and a box `{ x0, x1, z0, z1 }` on the floor, no height (`floor.ts`). |
| `boxAround()`, `distanceToBox()`, `overlaps()`, `contains()` | A box round a center, filled in place; how far a point is from a box; two boxes overlapping, edges touching counting; a point inside a box (`floor.ts`). |
| `circleCrossings()`, `pointAlong()` | Where two circles' outlines cross; a point along a line by its length (`floor.ts`). |
| `new Place(…)`, `Lifetime`, `Move`, `Perceiving` | Where something is, how long it's needed (`until`, `keep`, `close(at)`, `done(t)`), and what it's perceived as there (`perceived`, its user's type). `moveTo(position, at)` moves it from a time on; `update(t)` takes the moves due and returns what it's perceived as once `changed()` says it matters; `shift(offset)` (`place.ts`). |
| `new Places(perceiving)`: `all`, `place()`, `add()`, `update()`, `shift()`; `Placed` | The live list of anything with a place: its `place`, `perceivedAs(perceived)` and `letGo()`. Each is let go once past its time and the rest followed on every tick; `place(position, lifetime)` makes a place perceived as the list was handed (`places.ts`). |
| `new WrapAround(sizes)`: `offset()`, `distance()`, `toNearest()` | A world that wraps round, as a torus does: off one edge and in at the other. A size for each axis is read live, `Infinity` for none. `offset()` is the short way round, and `toNearest()` a place's copy nearest another (`wrap-around.ts`). |

Tests: `test/places.test.js`, on places written by hand, perceived as nothing but a distance; `test/floor.test.js`, the floor's points and boxes.

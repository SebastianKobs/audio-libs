# spatial

Anything placed and perceived from where you are, a sound or not: where it is, how long it's needed, what it's perceived as from a listener that moves, a change told once it matters, and a world that wraps round. What's perceived is its user's: the hearing hears a place as a level, a cutoff and a room ([`libs/spatial-audio/`](../spatial-audio/README.md)); a view could see one as a size, or a haptic layer feel one as a strength. It imports only `libs/util/`.

```ts
import { Places, WrapAround } from './index.ts';
const me = { x: 0, y: 0, z: 0 };
const places = new Places({
  perceive: (at) => Math.hypot(at.x - me.x, at.y - me.y, at.z - me.z),   // how far: what this user perceives
  changed: (before, now) => Math.abs(before - now) >= 1,                 // worth telling
});
const thing = { place: places.place({ x: 3, y: 0, z: 4 }, { until: 10 }), perceivedAs: (d) => draw(d), letGo: () => remove() };
places.add(thing);
thing.place.moveTo({ x: 0, y: 0, z: 8 }, 5);   // there from 5 on
onTick((t) => places.update(t));               // let go past 10; told as it, or you, move
const world = new WrapAround(() => ({ x: 100, y: Infinity, z: 100 }));
world.distance({ x: 10, y: 0, z: 0 }, { x: 95, y: 0, z: 0 });   // 15: the short way round
```

- `Position { x, y, z }` (`position.ts`): `x` and `z` across, `y` up, as Web Audio and three.js have them; `shifted(position, offset)`, a new one. What perceives a place takes one (`perceive(position)`), and so does the sound's listener (`distance(position)`, `side(position)`).
- `FloorPoint { x, z }` and `Box { x0, x1, z0, z1 }` (`floor.ts`): a point and a box on the floor, no height; `boxAround(box, centre, radius)` filled in place, `distanceToBox(point, box)`, `overlaps(first, second)`, `contains(box, point)`; `circleCrossings(first, firstRadius, second, secondRadius)`, where two circles' outlines cross; `pointAlong(points, lengths, along)`, a point along a line by its length.- `Place<Perceived>` (`place.ts`): where something is, how long it's needed (`until`, `keep`, `close(at)`, `done(t)`), and what it's perceived as there (`perceived`, of its user's type, `Heard` the sound's); moves from a time on (`moveTo(position, at)`, `next`), perceived as they're asked; `update(t)` takes those whose time has come and perceives it again, returning what's new once `changed(previous, next)` says it matters; `shift(offset)`.
- `Lifetime`, `Move<Perceived>`, `Perceiving<Perceived>` (`place.ts`): how long a place is needed, until a time or for good; a move from a time on, where to and how it's perceived there; how a place is perceived from where the listener is now, and whether a change is worth telling.
- `Places<Perceived>` (`places.ts`): the live list (`all`) of anything with a place (`Placed`: its `place`, `perceivedAs(perceived)`, `letGo()`), each let go once past its time and the rest followed on every tick (`update(t)`), every place shifted with the world (`shift(offset)`); `place(position, lifetime)` makes a place perceived as it was handed (`perceive(position)`, `changed()`). The hearing keeps its emitters on one (`libs/spatial-audio/`), perceived by its model.
- `WrapAround` (`wrap-around.ts`): a world that wraps round, as a torus does, off one edge and in at the other, a size for each axis read live, `Infinity` for none: the short way round (`offset(from, to)`), its `distance()`, and the whole worlds to a place's copy nearest another (`toNearest(position, around)`).
Tested in node, on places written by hand, perceived as nothing but a distance (`test/places.test.js`, `test/floor.test.js`).

// ---------- spatial: anything placed and perceived from where you are: places with a lifetime, a world that wraps round ----------
// Its parts: a position, x and z across, y up (position.ts); a place with a lifetime, perceived from a listener as it moves (place.ts); the
// places a listener follows, each let go once past its time (places.ts); a world that wraps round, as a torus does (wrap-around.ts); a point
// and a box on the floor, where they meet (floor.ts)
export { shifted, type Position } from './position.ts';
export { Place, type Lifetime, type Move, type Perceiving } from './place.ts';
export { Places, type Placed } from './places.ts';
export { WrapAround } from './wrap-around.ts';
export { boxAround, contains, distanceToBox, overlaps, type Box, type FloorPoint } from './floor.ts';

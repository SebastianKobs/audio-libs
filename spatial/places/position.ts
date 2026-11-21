// ---------- spatial/places/position: a place in space, x and z across, y up, as Web Audio and three.js have them ----------
// A value: a position moved is a new one (shifted()). Generic, the spatial part's: anything placed, a sound or not

// where something is: x and z across, y up
export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

// a position moved by an offset, a new one
export function shifted(position: Position, offset: Position): Position {
  return { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z };
}

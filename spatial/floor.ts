// ---------- libs/spatial/floor: a point and a box on the floor, x across, z deep: where they lie and meet ----------

// a point on the floor, no height
export interface FloorPoint {
  x: number;
  z: number;
}
// a box on the floor, x0 to x1 across and z0 to z1 deep
export interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

// a box round a centre, filled in place, so a footprint read each frame makes no new object
export function boxAround(box: Box, centre: FloorPoint, radius: number): Box {
  box.x0 = centre.x - radius;
  box.x1 = centre.x + radius;
  box.z0 = centre.z - radius;
  box.z1 = centre.z + radius;
  return box;
}
// how far a point is from a box: 0 inside it
export function distanceToBox(point: FloorPoint, box: Box): number {
  return Math.hypot(Math.max(box.x0 - point.x, 0, point.x - box.x1), Math.max(box.z0 - point.z, 0, point.z - box.z1));
}
// two boxes overlapping, edges touching counting
export function overlaps(first: Box, second: Box): boolean {
  return first.x1 >= second.x0 && first.x0 <= second.x1 && first.z1 >= second.z0 && first.z0 <= second.z1;
}
// a point inside a box, its edges in
export function contains(box: Box, point: FloorPoint): boolean {
  return point.x >= box.x0 && point.x <= box.x1 && point.z >= box.z0 && point.z <= box.z1;
}

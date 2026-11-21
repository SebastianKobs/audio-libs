// ---------- spatial/places/floor: a point and a box on the floor, x across, z deep: where they lie and meet ----------

import { firstAfter } from '../../base/util/index.ts';

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
// where two circles' outlines cross: the two ends of their common chord. None apart, one inside the other or on one
// centre; the same point twice where they touch
export function circleCrossings(
  first: FloorPoint,
  firstRadius: number,
  second: FloorPoint,
  secondRadius: number,
): FloorPoint[] {
  const distance = Math.hypot(second.x - first.x, second.z - first.z);
  if (distance === 0 || distance > firstRadius + secondRadius || distance < Math.abs(firstRadius - secondRadius)) {
    return [];
  }
  const dx = second.x - first.x;
  const dz = second.z - first.z;
  const toChord = (distance * distance + firstRadius * firstRadius - secondRadius * secondRadius) / (2 * distance);
  const halfChord = Math.sqrt(Math.max(0, firstRadius * firstRadius - toChord * toChord));
  const chordX = first.x + (dx * toChord) / distance;
  const chordZ = first.z + (dz * toChord) / distance;
  return [1, -1].map((side) => ({
    x: chordX - (side * dz * halfChord) / distance,
    z: chordZ + (side * dx * halfChord) / distance,
  }));
}
// a point along a line by its length from the start: its points, and each point's length along it, rising from 0
export function pointAlong(points: readonly FloorPoint[], lengths: readonly number[], along: number): FloorPoint {
  const last = lengths.length - 1;
  if (along <= lengths[0]!) {
    return { x: points[0]!.x, z: points[0]!.z };
  }
  if (along >= lengths[last]!) {
    return { x: points[last]!.x, z: points[last]!.z };
  }
  const from = firstAfter(lengths, along, (length) => length) - 1; // within the line: past the first, before the last
  const to = from + 1;
  const fraction = (along - lengths[from]!) / (lengths[to]! - lengths[from]!);
  return {
    x: points[from]!.x + (points[to]!.x - points[from]!.x) * fraction,
    z: points[from]!.z + (points[to]!.z - points[from]!.z) * fraction,
  };
}

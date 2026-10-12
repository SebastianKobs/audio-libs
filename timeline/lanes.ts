// ---------- timeline/lanes: a lane's points in time, as automation is, and its value at a time (L1c) ----------
// A point a value at a time, jumping there, or gliding there by a time constant, as Web Audio's setTargetAtTime goes; placed among those at
// its time as Web Audio places an event; one that changes nothing thinned once it's settled; those before a window let go but the last
import type { Seconds } from '../clock/index.ts';

// a lane's point: a value at a time, jumping there, or gliding there by a time constant (glide), as an automation point's curve
export interface LanePoint {
  t: Seconds;
  value: number;
  glide?: Seconds;
}
// a lane: what the caller knows it by, its id's own fields, and its points in time order
export type Lane<Id extends object> = Id & { points: LanePoint[] };
// an event's own lanes, by their names
export type EventLanes = Partial<Record<string, LanePoint[]>>;

// a point into its lane, after those at or before its time, as Web Audio places an event among those at its time
export function placed(points: LanePoint[], point: LanePoint): void {
  points.splice(points.findLastIndex((before) => before.t <= point.t) + 1, 0, point);
}
// a lane's points with those that change nothing left out, once settled: each setting its lane to what the one before it set, the same way,
// a jump to the same value after a jump, a glide to the same value by the same time constant after a glide; the first against where it
// starts from, if it's given
export function thinned(points: readonly LanePoint[], settled: Seconds, from?: LanePoint): LanePoint[] {
  const kept: LanePoint[] = [];
  let before = from;
  for (const point of points) {
    if (point.t < settled && before && point.value === before.value && point.glide === before.glide) {
      continue;
    }
    kept.push(point);
    before = point;
  }
  return kept;
}
// a lane's points from a time on, and its last before it, its value from then
export function keptFrom(points: readonly LanePoint[], before: Seconds): LanePoint[] {
  const first = points.findIndex((point) => point.t >= before);
  if (first < 0) {
    return points.slice(-1);
  }
  return points.slice(Math.max(0, first - 1));
}
// a lane's value at a time: its last point's by then, a jump's its value, a glide's where it had got to from where the lane was, by its
// time constant, as Web Audio's setTargetAtTime goes; none before its first point
export function valueAt(points: readonly LanePoint[], t: Seconds): number | undefined {
  let value: number | undefined;
  let gliding: { point: LanePoint; from: number } | null = null;
  for (const point of points) {
    if (point.t > t) {
      break;
    }
    if (gliding) {
      value = glidedTo(gliding, point.t);
    }
    if (point.glide === undefined || value === undefined) {
      value = point.value;
      gliding = null;
      continue;
    }
    gliding = { point, from: value };
  }
  return gliding ? glidedTo(gliding, t) : value;
}
// where a glide had got to by a time
function glidedTo({ point, from }: { point: LanePoint; from: number }, t: Seconds): number {
  return point.value + (from - point.value) * Math.exp(-(t - point.t) / point.glide!); // a glide has its time constant
}
// a lane's last point's value by a time, what it was set to, a glide's curve not followed; none before its first point
export function lastValueAt(points: readonly LanePoint[], t: Seconds): number | undefined {
  return points.findLast((point) => point.t <= t)?.value;
}

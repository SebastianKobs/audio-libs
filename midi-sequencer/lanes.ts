// ---------- midi-sequencer/lanes: a lane's points, as automation is, and its value at a time as Web Audio plays it (L1c2) ----------
// A point a value at a time, jumping there, or gliding there by a time constant, as Web Audio's setTargetAtTime goes: the music's, on the
// timeline as an event that holds until the next of its lane (libs/timeline/); the timeline's until L1c2
import type { Seconds } from '../clock/index.ts';
import { approach, lastAtOrBefore, type TimedValue } from '../util/index.ts';

// a lane's point: a value at a time, jumping there, or gliding there by a time constant (glide), as an automation point's curve
export type LanePoint = TimedValue;

// whether a point sets its lane to what the one before it set, the same way: a jump to the same value after a jump, a glide to the same
// value by the same time constant after a glide; one that does changes nothing
export function samePoint(before: LanePoint, after: LanePoint): boolean {
  return after.value === before.value && after.glide === before.glide;
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
  return approach(from, point.value, t - point.t, point.glide!); // a glide has its time constant
}
// a lane's last point's value by a time, what it was set to, a glide's curve not followed; none before its first point
export function lastValueAt(points: readonly LanePoint[], t: Seconds): number | undefined {
  return lastAtOrBefore(points, t, (point) => point.t)?.value;
}

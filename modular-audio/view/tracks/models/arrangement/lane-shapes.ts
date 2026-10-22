// ---------- view/tracks/models/arrangement/lane-shapes: a lane's line as the arrangement draws it ----------
// In clock time and its controller's value.
import { automationOf, Levels, type TimedValue } from '../../../../../base/automation/index.ts';
import { firstAfter, SETTLED } from '../../../../../base/util/index.ts';

// a corner of a lane's line: a value at a time
export interface Corner {
  t: number;
  value: number;
}
// the time a line is drawn for, clock times, an earlier point worked out but not drawn; and how far apart a glide's curve is sampled
interface Span {
  from: number;
  to: number;
  step: number;
}

// A lane's line from a time to a time, its points played as automation:
//   - a jump: straight up or down at its time, held until the next;
//   - a glide: its curve sampled a step apart until it has settled, then held;
//   - points at one time: passed through in turn, as a DAW shows its breakpoints;
//   - held at the last value to the end; nothing before the first point.
// Drawn from the last points before the view.
export function laneLine(points: readonly TimedValue[], span: Span): Corner[] {
  if (!points.length || points[0]!.t > span.to) {
    return [];
  }
  const levels = new Levels(automationOf(points));
  const first = firstDrawn(points, span.from);
  const corners: Corner[] = [comingIn(points, first, levels)];
  for (let index = first; index < points.length && points[index]!.t <= span.to; index++) {
    const end = Math.min(points[index + 1]?.t ?? span.to, span.to);
    piece(points[index]!, levels, { ...span, to: end }, corners);
  }
  return corners;
}
// the first point drawn: the first of those at the time of the last by the view's start
function firstDrawn(points: readonly TimedValue[], from: number): number {
  let index = Math.max(0, firstAfter(points, from, (point) => point.t) - 1);
  while (index > 0 && points[index - 1]!.t === points[index]!.t) {
    index--;
  }
  return index;
}
// where the line comes in at the first point drawn: the level before it; nothing before, its own value
function comingIn(points: readonly TimedValue[], first: number, levels: Levels): Corner {
  const { t, value } = points[first]!;
  if (first === 0) {
    return { t, value };
  }
  return { t, value: levels.before(t) };
}
// A point's piece of the line, from its time to the next's:
//   - a jump: straight there, and held;
//   - a glide: its curve sampled until it has settled, then held;
//   - at the next point's time: passed through, nothing held.
// It ends coming up to the next point, that point's jump not yet made.
function piece({ t, value, glide }: TimedValue, levels: Levels, { to, step }: Span, corners: Corner[]): void {
  if (!glide) {
    put(corners, { t, value });
  }
  if (to === t) {
    return;
  }
  if (glide) {
    const settled = t + SETTLED * glide;
    for (let time = t + step; time < Math.min(settled, to); time += step) {
      put(corners, { t: time, value: levels.at(time) });
    }
    if (settled < to) {
      put(corners, { t: settled, value: levels.at(settled) });
    }
  }
  put(corners, { t: to, value: levels.before(to) });
}
// a corner put on the line, but not where the last already is
function put(corners: Corner[], corner: Corner): void {
  const last = corners.at(-1);
  if (last && last.t === corner.t && last.value === corner.value) {
    return;
  }
  corners.push(corner);
}

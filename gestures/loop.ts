// ---------- gestures/loop: whether a drag winds into a loop, read from the stroke's samples (stroke.ts) ----------
// A loop is read from the same samples: the latest stretch of the stroke that winds circleTurn, its turns added up as they come, but not
// those back on itself (over circleReversal). It counts only if it turns one way, at least circleOneWay of all its turning; it's round,
// enclosing at least circleRound of a circle its size; it's at least circleMin px across; and the whole stroke is at most circleSize on
// the floor, so a long vine never vanishes into a tower. A scribble winds too, its turns adding up at random, but it turns both ways,
// encloses little, or is too small
import { radians } from './shared.ts';
import type { Pointer, Stroke, Tracking } from './shared.ts';

// a drag's winding as its samples come, and a sample of it (stroke.ts)
type Winding = Stroke['loop'];
type WindingSample = Winding['samples'][number];

// is the drag a loop? See the top. stroke.loop holds every sample with its direction: the winding up to it, all the turning up to it,
// either way, and the floor point it came with
export function noticeLoop(
  tracking: Tracking,
  pointer: Pointer,
  stroke: Stroke,
  screenX: number,
  screenY: number,
  turn: number,
): void {
  const loop = stroke.loop;
  const need = tracking.settings.circleTurn * 2 * Math.PI;
  addSample(tracking, pointer, loop, screenX, screenY, turn);
  if (loop.highest - loop.lowest < need) {
    return;
  }
  const stretch = windingStretch(tracking, loop, need);
  if (!stretch || !isRound(tracking, stretch)) {
    return;
  }
  const floor = stroke.floor;
  if (!floor || Math.max(floor.maxX - floor.minX, floor.maxZ - floor.minZ) > tracking.settings.circleSize) {
    return;
  }
  loopOnFloor(tracking, pointer, stretch);
}
// a sample's turn added to the winding, unless it turns back on itself; to the turning either way
function addSample(
  tracking: Tracking,
  pointer: Pointer,
  loop: Winding,
  screenX: number,
  screenY: number,
  turn: number,
): void {
  if (Math.abs(turn) < radians(tracking.settings.circleReversal)) {
    loop.winding += turn;
  }
  loop.turning += Math.abs(turn);
  loop.samples.push({ x: screenX, y: screenY, winding: loop.winding, turning: loop.turning, g: pointer.g });
  loop.lowest = Math.min(loop.lowest, loop.winding);
  loop.highest = Math.max(loop.highest, loop.winding);
}
// the latest stretch that winds enough, back from the last sample, if it turns one way enough of all its turning
function windingStretch(tracking: Tracking, loop: Winding, need: number): WindingSample[] | null {
  let start = loop.samples.length - 1;
  while (start >= 0 && Math.abs(loop.winding - loop.samples[start]!.winding) < need) {
    start--;
  }
  if (
    start < 0
    || Math.abs(loop.winding - loop.samples[start]!.winding)
      < tracking.settings.circleOneWay * (loop.turning - loop.samples[start]!.turning)
  ) {
    return null;
  }
  return loop.samples.slice(start);
}
// round enough: at least circleMin px across, enclosing at least circleRound of a circle its size
function isRound(tracking: Tracking, stretch: WindingSample[]): boolean {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  let area = 0;
  stretch.forEach((point, i) => {
    const next = stretch[(i + 1) % stretch.length]!;
    area += point.x * next.y - next.x * point.y; // the shoelace: twice the area it encloses, closed back to its start
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  });
  const across = Math.max(right - left, bottom - top);
  const tooSmall = across < tracking.settings.circleMin;
  const tooFlat = Math.abs(area) / 2 < (tracking.settings.circleRound * Math.PI * across * across) / 4;
  return !tooSmall && !tooFlat;
}
// a loop, where it is on the floor: its centre and size, from the stretch's floor points, if it has any
function loopOnFloor(tracking: Tracking, pointer: Pointer, stretch: WindingSample[]): void {
  const floorPoints = stretch.filter((sample) => sample.g).map((sample) => sample.g!);
  if (!floorPoints.length) {
    return;
  }
  const minX = Math.min(...floorPoints.map((point) => point.x));
  const maxX = Math.max(...floorPoints.map((point) => point.x));
  const minZ = Math.min(...floorPoints.map((point) => point.z));
  const maxZ = Math.max(...floorPoints.map((point) => point.z));
  pointer.state = 'looping';
  tracking.emit('loop', pointer, {
    centre: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    size: Math.max(maxX - minX, maxZ - minZ),
  });
}

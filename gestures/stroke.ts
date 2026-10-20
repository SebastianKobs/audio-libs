// ---------- gestures/stroke: the stroke's shape, read from its samples as a drag moves ----------
// The stroke's shape is read on the screen, not on the floor, so perspective doesn't change it: resampled every 10 px, with its direction
// taken over the last 30 px, so a finger's jitter evens out, and turns under 1° from one sample to the next taken as jitter:
// - turn { kind, angle }: a corner is a sharp turn, at least cornerAngle within 30 px, and 30 px after the last one. A bend is every
//   bendAngle of gentler turning, counted whichever way it turns, so a wave counts too. A corner starts that count again
// - shape { shape, prev }: what the last shapeSpan of the path is: zigzag if a corner is in it, curve if it turns curveAngle or more,
//   straight otherwise. Once a curve, it stays one down to 60% of that, so a wave doesn't flicker between the two
// - zone { zone, prev }: the finger crossed into another zone, the one it's in now
// - rest: still for 0.1 s. move: moving again after a rest, or the drag's first movement
// Whether it loops is read from the same samples (loop.ts)
import { wrapAngle } from '../util/index.ts';
import { radians } from './settings.ts';
import type { FloorPoint } from '../spatial/index.ts';
import type { StrokeShape } from './events.ts';
import type { Pointer, Stroke, Tracking } from './pointers.ts';
import { noticeLoop } from './loop.ts';

const SAMPLE_PX = 10;
const CHORD_SAMPLES = 3;
const JITTER_TURN = Math.PI / 180;
const CORNER_PX = 30;
export const REST = 0.1;

// a loop's move: if it moved, it's not still (restingFor())
export function stillSince(pointer: Pointer): void {
  const stroke = pointer.track!; // a loop's: it was a drag
  if (Math.hypot(pointer.x - stroke.lastX, pointer.y - stroke.lastY) > 0.5) {
    stroke.lastMoved = pointer.t;
    stroke.lastX = pointer.x;
    stroke.lastY = pointer.y;
  }
}
// one move of a drag. pointer.track is written here, and a loop's stillness in stillSince()
export function readStroke(tracking: Tracking, pointer: Pointer): void {
  let stroke = pointer.track;
  if (stroke) {
    noticeMoving(tracking, pointer, stroke);
  } else {
    stroke = startStroke(tracking, pointer);
  }
  if (pointer.g) {
    followZone(tracking, pointer, stroke, pointer.g);
  }
  sampleAlong(tracking, pointer, stroke);
}
// the drag's first move: its stroke, on the floor from where it was pressed
function startStroke(tracking: Tracking, pointer: Pointer): Stroke {
  const { x, y, t } = pointer;
  const stroke: Stroke = {
    recent: [[x, y]],
    direction: null,
    turns: [],
    along: 0,
    lastCorner: -Infinity,
    bending: 0,
    shape: 'straight',
    zone: null,
    lastMoved: t,
    lastX: x,
    lastY: y,
    rested: false,
    loop: { samples: [], winding: 0, turning: 0, lowest: 0, highest: 0 },
    floor: null,
  };
  pointer.track = stroke;
  if (pointer.pressG) {
    coverFloor(stroke, pointer.pressG);
  }
  tracking.emit('move', pointer);
  return stroke;
}
// it moved: after a rest, it moves again, the rest said first if a tick was too short to see it
function noticeMoving(tracking: Tracking, pointer: Pointer, stroke: Stroke): void {
  const { x, y, t } = pointer;
  const moved = Math.hypot(x - stroke.lastX, y - stroke.lastY) > 0.5;
  if (!moved) {
    return;
  }
  if (t - stroke.lastMoved >= REST) {
    if (!stroke.rested) {
      tracking.emit('rest', pointer, { t: stroke.lastMoved + REST });
    }
    tracking.emit('move', pointer);
  }
  stroke.lastMoved = t;
  stroke.lastX = x;
  stroke.lastY = y;
  stroke.rested = false;
}
// the zone where the finger is, said as it crosses into another
function followZone(tracking: Tracking, pointer: Pointer, stroke: Stroke, floorPoint: FloorPoint): void {
  coverFloor(stroke, floorPoint);
  const zone = tracking.handedIn.zoneAt(floorPoint);
  if (stroke.zone !== null && zone !== stroke.zone) {
    tracking.emit('zone', pointer, { zone, prev: stroke.zone });
  }
  stroke.zone = zone;
}
// a sample every 10 px along the way, even when the pointer jumps
function sampleAlong(tracking: Tracking, pointer: Pointer, stroke: Stroke): void {
  const { x, y } = pointer;
  for (;;) {
    const [sampleX, sampleY] = stroke.recent[stroke.recent.length - 1]!; // never empty: it starts with the first point
    const distance = Math.hypot(x - sampleX, y - sampleY);
    if (distance < SAMPLE_PX || pointer.state !== 'dragging') {
      return;
    }
    sample(
      tracking,
      pointer,
      stroke,
      sampleX + ((x - sampleX) * SAMPLE_PX) / distance,
      sampleY + ((y - sampleY) * SAMPLE_PX) / distance,
    );
  }
}
function coverFloor(stroke: Stroke, point: FloorPoint): void {
  const box = stroke.floor || (stroke.floor = { x0: point.x, x1: point.x, z0: point.z, z1: point.z });
  box.x0 = Math.min(box.x0, point.x);
  box.x1 = Math.max(box.x1, point.x);
  box.z0 = Math.min(box.z0, point.z);
  box.z1 = Math.max(box.z1, point.z);
}
// a sample of the stroke, every SAMPLE_PX along it: its direction over the last 30 px, its corners and bends, its shape, and whether it
// loops
function sample(tracking: Tracking, pointer: Pointer, stroke: Stroke, screenX: number, screenY: number): void {
  stroke.recent.push([screenX, screenY]);
  if (stroke.recent.length > CHORD_SAMPLES + 1) {
    stroke.recent.shift();
  }
  stroke.along += SAMPLE_PX;
  if (stroke.recent.length <= CHORD_SAMPLES) {
    return;
  }
  const [fromX, fromY] = stroke.recent[0]!; // more than CHORD_SAMPLES of them
  const direction = Math.atan2(screenY - fromY, screenX - fromX);
  let turn = stroke.direction === null ? 0 : wrapAngle(direction - stroke.direction);
  if (Math.abs(turn) < JITTER_TURN) {
    turn = 0;
  }
  stroke.direction = direction;
  stroke.turns.push({ along: stroke.along, turn });
  noticeTurn(tracking, pointer, stroke, turn);
  const span = tracking.settings.shapeSpan * tracking.handedIn.height;
  while (stroke.turns.length && stroke.turns[0]!.along < stroke.along - span) {
    stroke.turns.shift();
  }
  const shape = shapeNow(tracking, stroke, span);
  if (shape !== stroke.shape) {
    const previous = stroke.shape;
    stroke.shape = shape;
    tracking.emit('shape', pointer, { shape, prev: previous });
  }
  noticeLoop(tracking, pointer, stroke, screenX, screenY, turn);
}
// a corner, where the stroke turned sharply within CORNER_PX; else a bend each time its turning adds up to the bend angle
function noticeTurn(tracking: Tracking, pointer: Pointer, stroke: Stroke, turn: number): void {
  const recent = stroke.turns.filter((segment) => segment.along > stroke.along - CORNER_PX - 0.01);
  const sharp = Math.abs(recent.reduce((sum, segment) => sum + segment.turn, 0));
  if (sharp >= radians(tracking.settings.cornerAngle) && stroke.along - stroke.lastCorner >= CORNER_PX) {
    stroke.lastCorner = stroke.along;
    stroke.bending = 0;
    tracking.emit('turn', pointer, { kind: 'corner', angle: sharp });
    return;
  }
  stroke.bending += Math.abs(turn);
  if (stroke.bending >= radians(tracking.settings.bendAngle)) {
    stroke.bending -= radians(tracking.settings.bendAngle);
    tracking.emit('turn', pointer, { kind: 'bend', angle: radians(tracking.settings.bendAngle) });
  }
}
// the stroke's shape over the last span: a zigzag with a corner in it, a curve once it has turned enough (a curve needs less to stay
// one), else straight
function shapeNow(tracking: Tracking, stroke: Stroke, span: number): StrokeShape {
  if (stroke.lastCorner >= stroke.along - span) {
    return 'zigzag';
  }
  const turning = stroke.turns.reduce((sum, segment) => sum + Math.abs(segment.turn), 0);
  const needed = radians(tracking.settings.curveAngle) * (stroke.shape === 'curve' ? 0.6 : 1);
  if (turning >= needed) {
    return 'curve';
  }
  return 'straight';
}

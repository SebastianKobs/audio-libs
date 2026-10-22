// ---------- gestures/events: the tracker's events, what each one carries, and the states a pointer is in ----------
// Events, to on(type, fn), each fn(e) with the pointer's id, t, x, y, g and state, from the input that set them off:
// - press: down. hold: still pressed after holdDelay, seen on the clock's tick
// - dragstart: past the drag threshold (moveThreshold, px from where it was pressed). Then dragmove on each move, from that one on
// - while dragging, before each dragmove, the shape of the stroke (stroke.ts): turn, shape, zone, rest and move. And loop { centre, size }, once:
//   the drag wound into a circle, centred there on the floor and that big. It's looping from then on, with only dragmove
// - up: tap, then release, if it was only pressed; else release. cancel: interrupted instead, as when the tab is hidden
// - panstart, panmove, panend: a right-button drag, from down to up or cancel; or two fingers, as the first, from the point between them
// - takeback: a second finger made a pair of the first: what the first started goes
// The stroke's shape is read in stroke.ts, and whether it loops in loop.ts, from the same samples

import type { FloorPoint } from '../places/index.ts';

// what a pointer is doing: pressed, then dragging (looping once it winds) or holding; panning (the right button); one of a pair of
// fingers; or done, the one left of a pair, until it's lifted
export type PointerState = 'pressed' | 'dragging' | 'holding' | 'looping' | 'panning' | 'pair' | 'done';
export type StrokeShape = 'straight' | 'curve' | 'zigzag';
// an event, as every listener gets it: the pointer's id, its time, where it is on the screen and the floor, and its state
export interface GestureEvent {
  id: number;
  t: number;
  x: number;
  y: number;
  g: FloorPoint | null;
  state: PointerState;
}
// each event's own, by its type
export type GestureEvents = {
  press: [GestureEvent];
  hold: [GestureEvent];
  dragstart: [GestureEvent];
  dragmove: [GestureEvent];
  turn: [GestureEvent & { kind: 'corner' | 'bend'; angle: number }];
  shape: [GestureEvent & { shape: StrokeShape; prev: StrokeShape }];
  zone: [GestureEvent & { zone: number | null; prev: number }];
  rest: [GestureEvent];
  move: [GestureEvent];
  loop: [GestureEvent & { centre: FloorPoint; size: number }];
  tap: [GestureEvent];
  release: [GestureEvent];
  cancel: [GestureEvent];
  panstart: [GestureEvent];
  panmove: [GestureEvent];
  panend: [GestureEvent];
  takeback: [GestureEvent];
};
export type EventType = keyof GestureEvents;
// what an event adds to the pointer's: its own, and where a pair's or a tick's differs
export type Extra<Type extends EventType> = Partial<GestureEvent> & Omit<GestureEvents[Type][0], keyof GestureEvent>;

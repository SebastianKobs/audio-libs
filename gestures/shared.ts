// ---------- gestures/shared: what every part of the gesture tracker uses: its events, what's handed in, the pointers that are down ----------
// The gesture tracker: all pointer input, read in one place. It only tells: everything else
// reacts to its events.
// A page hands it each pointer's down, move, up and cancel (tracker.ts), and reacts to what
// it emits. It knows nothing of the DOM or a 3D scene: each input brings the floor point under
// the pointer (g, null off the floor).
// Handed in (configure()): the screen's height, and the zone under a floor point.
// Each pointer has a state:
// - the left button, or any but the right: pressed, then dragging once it's moved past the drag threshold, or holding once it's stayed
//   pressed for holdDelay. Either is for good, until it's let go. A drag that winds into a small loop is looping from then on
// - the right button: panning
// - two fingers (pair.ts): a second pointer down within "two-finger window" of the first makes the two a pair, which pans, as the design
//   document has it: one finger is for stimming, two move the view. Whatever the first had started is taken back. Lift one, and the other
//   does nothing until it's lifted, or a finger goes down again beside it, which pans on. A second pointer after the window, or a third,
//   is ignored, so a stray finger or a palm never interrupts a stroke
// Events, to on(type, fn), each fn(e) with the pointer's id, t, x, y, g and state, from the input that set them off:
// - press: down. hold: still pressed after holdDelay, seen on the clock's tick
// - dragstart: past the drag threshold (moveThreshold, px from where it was pressed). Then dragmove on each move, from that one on
// - while dragging, before each dragmove, the shape of the stroke (stroke.ts): turn, shape, zone, rest and move. And loop { centre, size }, once:
//   the drag wound into a circle, centred there on the floor and that big. It's looping from then on, with only dragmove
// - up: tap, then release, if it was only pressed; else release. cancel: interrupted instead, as when the tab is hidden
// - panstart, panmove, panend: a right-button drag, from down to up or cancel; or two fingers, as the first, from the point between them
// - takeback: a second finger made a pair of the first: what the first started goes
// The stroke's shape is read in stroke.ts, and whether it loops in loop.ts, from the same samples

import type { Box, FloorPoint } from '../spatial/index.ts';

// what a pointer is doing: pressed, then dragging (looping once it winds) or holding; panning (the right button); one of a pair of
// fingers; or done, the one left of a pair, until it's lifted
type PointerState = 'pressed' | 'dragging' | 'holding' | 'looping' | 'panning' | 'pair' | 'done';
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
// An input, as the page hands it: the pointer's id, its button (down only), screen x and y,
// its own time t on the clock's timeline, and the floor point g under it.
export interface PointerInput {
  id: number;
  button?: number;
  x: number;
  y: number;
  t: number;
  g: FloorPoint | null;
}
// a stroke's samples, for its shape (readStroke()) and whether it loops (noticeLoop())
export interface Stroke {
  recent: [screenX: number, screenY: number][];
  direction: number | null;
  turns: { along: number; turn: number }[];
  along: number;
  lastCorner: number;
  bending: number;
  shape: StrokeShape;
  zone: number | null;
  lastMoved: number;
  lastX: number;
  lastY: number;
  rested: boolean;
  loop: {
    samples: { x: number; y: number; winding: number; turning: number; g: FloorPoint | null }[];
    winding: number;
    turning: number;
    lowest: number;
    highest: number;
  };
  floor: Box | null;
}
// a pointer that's down: where it was pressed (none for a pair's second), where it is, its stroke, its hand's speed, and a pair's pan and
// mate
export interface Pointer {
  id: number;
  state: PointerState;
  pressX?: number;
  pressY?: number;
  pressT?: number;
  pressG?: FloorPoint | null;
  x: number;
  y: number;
  t: number;
  g: FloorPoint | null;
  track?: Stroke | null;
  speed?: number | null;
  pan?: number;
  mate?: Pointer | null;
}

// Handed in (configure()), each with a default until it is:
//   - height: the screen's height in px, 900 until the page hands its own;
//   - zoneAt(): the zone under a floor point, a number its user gives, or none.
export interface HandedIn {
  height: number;
  zoneAt: (point: FloorPoint) => number | null;
}
// What it reads live:
//   - how far a press moves before it drags, how long it stays before it holds;
//   - how a hand's speed is smoothed, two fingers' window;
//   - the stroke's span, corners, bends and curves; what makes a loop (loop.ts).
// Its own; a user's settings may extend them.
export interface TrackerSettings {
  moveThreshold: number;
  holdDelay: number;
  handSmooth: number;
  twoFinger: number;
  shapeSpan: number;
  cornerAngle: number;
  bendAngle: number;
  curveAngle: number;
  circleTurn: number;
  circleReversal: number;
  circleOneWay: number;
  circleMin: number;
  circleRound: number;
  circleSize: number;
}
// what the tracker's parts (loop.ts, stroke.ts, pair.ts) use of it (tracker.ts): every pointer that's down, by id, written by the parts
// only; what's handed in; its settings; an event sent
export interface Tracking {
  readonly pointers: Map<number, Pointer>;
  readonly handedIn: HandedIn;
  readonly settings: TrackerSettings;
  emit<Type extends EventType>(type: Type, pointer: Pointer, more?: Extra<Type>): void;
}

// The settings a tracker starts with, unless its user's differ.
export const TRACKER_DEFAULTS: Readonly<TrackerSettings> = {
  moveThreshold: 8, // screen px before a press becomes a drag
  holdDelay: 0.4, // s a press stays still before it becomes a hold
  // s: a drag's hand speed is smoothed over about this long (tracker.ts).
  handSmooth: 0.25,
  // s: a second finger down within this of the first makes the two a pan, taking back what
  // the first started. Later, it's ignored.
  twoFinger: 0.3,
  // A stroke's shape, read on the screen (stroke.ts):
  shapeSpan: 0.13, // the length of path a shape is read from, a share of the screen height
  cornerAngle: 70, // degrees of turning within 30 px that make a corner
  bendAngle: 90, // degrees of gentler turning, either way, that make a bend
  curveAngle: 35, // degrees of turning over the shape span that make a curve, not straight
  // A loop (loop.ts):
  circleTurn: 0.8, // turns a drag has to wind before it becomes a circle
  circleReversal: 120, // degrees: a turn this sharp goes back on itself, winding no circle
  circleOneWay: 0.9, // share of a loop's turning that goes one way; a scribble turns both
  // Screen px a loop must be across at least: a finger trembling on a spot isn't a circle.
  circleMin: 40,
  circleRound: 0.4, // share of a circle a loop must enclose: an oval is round enough
  circleSize: 4, // floor units: bigger loops stay drags
};

export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

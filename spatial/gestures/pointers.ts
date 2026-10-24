// ---------- gestures/pointers: the input the page hands in, the pointers that are down, and what the tracker's parts share of them ----------

import type { Box, FloorPoint } from '../places/index.ts';
import type { EventType, Extra, PointerState, StrokeShape } from './events.ts';
import type { TrackerSettings } from './settings.ts';

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
  timedX?: number; // where the last move with a time of its own was: moves stamped at one time count from it
  timedY?: number;
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
// what the tracker's parts (loop.ts, stroke.ts, pair.ts) use of it (tracker.ts): every pointer that's down, by id, written by the parts
// only; what's handed in; its settings; an event sent
export interface Tracking {
  readonly pointers: Map<number, Pointer>;
  readonly handedIn: HandedIn;
  readonly settings: TrackerSettings;
  emit<Type extends EventType>(type: Type, pointer: Pointer, more?: Extra<Type>): void;
}

// ---------- gestures: the gesture tracker, a package of its own (R13, moved out of garden-surface/) ----------
// Pointer input in, gestures out: strokes and their shape, holds, loops and two-finger pans, for whoever listens (on()). No DOM: a page
// hands it each pointer's input, its screen place and the floor point under it, if it has a floor; what a place's pitch is, handed in
// (configure()). Its time the clock's (clock/), its settings its own (TrackerSettings), which a garden's extend. Its parts: what every
// part uses, its types and what's handed in (shared.ts), a drag that winds into a loop (loop.ts), the stroke's shape (stroke.ts), two
// fingers, a pair that pans (pair.ts), the tracker itself (tracker.ts)
export { GestureTracker } from './tracker.ts';
export {
  type FloorPoint,
  type GestureEvent,
  type GestureEvents,
  type PointerInput,
  type TrackerSettings,
  TRACKER_DEFAULTS,
} from './shared.ts';

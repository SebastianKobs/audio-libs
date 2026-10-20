// ---------- gestures: the gesture tracker ----------
// Pointer input in, gestures out: strokes and their shape, holds, loops and two-finger pans,
// for whoever listens (on()).
// No DOM: a page hands it each pointer's input, its screen place and the floor point under it,
// if it has a floor; the zone under a floor point handed in (configure()).
// Its time the clock's (clock/); its settings its own (TrackerSettings), which a user's extend.
// Its parts:
//   - shared.ts: what every part uses, its types and what's handed in;
//   - loop.ts: a drag that winds into a loop;
//   - stroke.ts: the stroke's shape, and the zones it crosses;
//   - pair.ts: two fingers, a pair that pans;
//   - tracker.ts: the tracker itself.
export { GestureTracker } from './tracker.ts';
export {
  type GestureEvent,
  type GestureEvents,
  type PointerInput,
  type TrackerSettings,
  TRACKER_DEFAULTS,
} from './shared.ts';

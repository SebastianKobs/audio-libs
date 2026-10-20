// ---------- gestures: the gesture tracker ----------
// Pointer input in, gestures out: strokes and their shape, holds, loops and two-finger pans,
// for whoever listens (on()).
// No DOM: a page hands it each pointer's input, its screen place and the floor point under it,
// if it has a floor; the zone under a floor point handed in (configure()).
// Its time the clock's (clock/); its settings its own (TrackerSettings), which a user's extend.
// Its parts:
//   - events.ts: the events, their types, and the states a pointer is in;
//   - pointers.ts: the pointers that are down, what's handed in, a stroke's samples;
//   - settings.ts: what the tracker reads live and starts with;
//   - loop.ts: a drag that winds into a loop;
//   - stroke.ts: the stroke's shape, and the zones it crosses;
//   - pair.ts: two fingers, a pair that pans;
//   - tracker.ts: the tracker itself.
export { GestureTracker } from './tracker.ts';
export type { GestureEvent, GestureEvents } from './events.ts';
export type { PointerInput } from './pointers.ts';
export { TRACKER_DEFAULTS, type TrackerSettings } from './settings.ts';

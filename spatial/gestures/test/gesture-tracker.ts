// ---------- the tests' gesture tracker: made for each test, on a clock and settings of its own ----------
// The unit tests and the vectors' writer (run-gestures.js) drive it whole, its input in and its events out, a tracker as the garden
// makes one (garden.ts), from its package's entry, so its tests go wherever it goes; the replays' recorder drives the garden's own
import { Clock } from '../../../sequencing/clock/index.ts';
import { GestureTracker, TRACKER_DEFAULTS, type GestureEvents, type TrackerSettings } from '../index.ts';

// Every event the tracker emits, once each.
// One missing, or one it doesn't emit, fails the type check.
const EVERY_EVENT = {
  press: true,
  hold: true,
  dragstart: true,
  dragmove: true,
  turn: true,
  shape: true,
  zone: true,
  rest: true,
  move: true,
  loop: true,
  tap: true,
  release: true,
  cancel: true,
  panstart: true,
  panmove: true,
  panend: true,
  takeback: true,
} as const satisfies Record<keyof GestureEvents, true>;
export const EVENTS = Object.keys(EVERY_EVENT) as (keyof GestureEvents)[];

// A tracker, its settings as it starts them (each vector's case sets its own as it runs, run-gestures.js)
// and its clock, the test's own: the tracker asks it only its time and its ticks, never its grid.
export function trackerOnItsOwnClock(): { tracker: GestureTracker; clock: Clock; settings: TrackerSettings } {
  const settings: TrackerSettings = { ...TRACKER_DEFAULTS };
  const clock = new Clock({ settings: { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16' } });
  return { tracker: new GestureTracker({ settings, clock }), clock, settings };
}

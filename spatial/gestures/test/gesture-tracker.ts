// ---------- the tests' gesture tracker: one of its own, by the names its functions had before it was a class ----------
// The unit tests and the vectors' writer (run-gestures.js) drive it whole, its input in and its events out, a tracker as the garden
// makes one (garden.ts), from its package's entry, on a clock and settings of its own, so its tests go wherever it goes (R14); the
// replays' recorder drives the garden's own
import { Clock } from '../../../sequencing/clock/index.ts';
import { GestureTracker, TRACKER_DEFAULTS, type GestureEvents, type TrackerSettings } from '../index.ts';

// its settings, as a tracker starts them, each vector's case setting its own as it runs (run-gestures.js)
export const settings: TrackerSettings = { ...TRACKER_DEFAULTS };
// its clock, the tests' own: the tracker asks it only its time and its ticks, never its grid
export const clock = new Clock({ settings: { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16' } });

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

const tracker = new GestureTracker({ settings, clock });
export const configure: GestureTracker['configure'] = (options) => tracker.configure(options);
export const on: GestureTracker['on'] = (type, listener) => tracker.on(type, listener);
export const restingFor: GestureTracker['restingFor'] = (id) => tracker.restingFor(id);
export const speedOf: GestureTracker['speedOf'] = (id) => tracker.speedOf(id);
export const down: GestureTracker['down'] = (input) => tracker.down(input);
export const move: GestureTracker['move'] = (input) => tracker.move(input);
export const up: GestureTracker['up'] = (input) => tracker.up(input);
export const cancel: GestureTracker['cancel'] = (id, t) => tracker.cancel(id, t);

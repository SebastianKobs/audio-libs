// ---------- gestures/settings: what the tracker reads live and starts with: its thresholds, its timings, its stroke and loop limits ----------

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

// Runs one case of the gesture test vectors (shared/test-vectors/gestures/) through the gesture tracker, in the clock's fake mode, and
// returns the events it emitted. Used by the tracker's unit tests and by make-gesture-vectors.js, which writes the vectors.
// A case: its settings, the screen's height, and its input, in order. Before each input, time runs on to its t in the clock's ticks: one
// every 25 ms after the previous input, and one at the input's own time. Then the input is applied: down, move, up or cancel, or none, when
// only time passes. A floor point carries its zone, zone, which stands in for what a user hands in (zoneAt())
import { EVENTS, trackerOnItsOwnClock } from './gesture-tracker.ts';

const r9 = (v) => +v.toFixed(9);
export const r3 = (v) => +v.toFixed(3);
// the floor under a screen point, for the vectors: 50 px to a unit, and a zone every 40 px up the screen
const floor = (x, y) => ({ x: r3(x / 50), z: r3((y - 450) / 50), zone: Math.floor((900 - y) / 40) });
export const at = (id, x, y, more) => ({ id, x: r3(x), y: r3(y), ...more, g: floor(x, y) });
// a stroke's input: pressed at its first point at t0, a move every ms milliseconds, let go after the last
export function stroke(id, pts, { t0 = 0, ms = 16, button = 0, end = 'up' } = {}) {
  const input = [{ t: r3(t0), down: at(id, ...pts[0], { button }) }];
  pts.slice(1).forEach((q, k) => input.push({ t: r3(t0 + ((k + 1) * ms) / 1000), move: at(id, ...q) }));
  const t = r3(t0 + (pts.length * ms) / 1000);
  const [x, y] = pts[pts.length - 1];
  input.push(end === 'up' ? { t, up: at(id, x, y) } : { t, cancel: { id } });
  return input;
}
// what the vectors keep of an event: its type, pointer, time and state, where the pointer was, and what the event says
function brief(type, e) {
  const o = { type, id: e.id, t: r9(e.t), state: e.state, x: e.x, y: e.y };
  for (const k of ['kind', 'shape', 'zone', 'prev']) {
    if (e[k] !== undefined) {
      o[k] = e[k];
    }
  }
  if (e.angle !== undefined) {
    o.angle = r9(e.angle);
  }
  if (e.centre) {
    Object.assign(o, { centre: { x: r9(e.centre.x), z: r9(e.centre.z) }, size: r9(e.size) });
  }
  return o;
}
export function run(c) {
  const { tracker, clock, settings } = trackerOnItsOwnClock();
  Object.assign(settings, c.settings);
  tracker.configure({ height: c.screen.height, zoneAt: (g) => g.zone });
  clock.useFake(0);
  const got = [];
  const offs = EVENTS.map((type) => tracker.on(type, (e) => got.push(brief(type, e))));
  for (const s of c.input) {
    clock.advance(s.t - clock.now());
    if (s.down) {
      tracker.down({ ...s.down, t: s.t });
    }
    if (s.move) {
      tracker.move({ ...s.move, t: s.t });
    }
    if (s.up) {
      tracker.up({ ...s.up, t: s.t });
    }
    if (s.cancel) {
      tracker.cancel(s.cancel.id, s.t);
    }
  }
  offs.forEach((off) => off());
  return got;
}

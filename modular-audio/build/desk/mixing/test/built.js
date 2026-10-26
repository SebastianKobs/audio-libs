// What's built of a desk, a stand-in for the desk's tests: each call recorded, by its address as text; a way in by its
// address and its input, as text; its meters' levels and readings as a test sets them, by their address and point.
import { BuiltStandIn } from '../../../contract/test/built.js';

class DeskBuiltStandIn extends BuiltStandIn {
  levels = new Map();

  peak(address, point = '') {
    return this.levels.get([...address, point].join('/')) ?? 0;
  }
  reading(address, name) {
    return this.levels.get([...address, name].join('/')) ?? 0;
  }
  wayInto(address, input = 'in') {
    return `into ${[...address, input].join('/')}`;
  }
}
// A setup of the test's own: no track live, nothing set by notes.
const SETUP = { isLive: () => false, setBy: () => undefined };

// A desk on a plan, made with a setup, a clock, a time on what's built's clock, the tests' own unless
// given; what's built of it once built, and what it's handed to build, kept.
export function deskOn(Desk, plan, { setup = SETUP, clock = clockAt(0), at = (t) => t } = {}) {
  const desk = new Desk({ plan, setup: { ...SETUP, ...setup }, clock, at });
  const built = new DeskBuiltStandIn();
  const handed = [];
  const build = () =>
    desk.build((planned) => {
      handed.push(planned);
      return built;
    });
  return { desk, built, handed, build, clock };
}
// a clock of the test's own: its time now, and its ticks, each handed the time it's at
function clockAt(start) {
  const listeners = [];
  const clock = {
    time: start,
    now: () => clock.time,
    onTick: (listener) => {
      listeners.push(listener);
      return () => {};
    },
    tick: (t) => {
      clock.time = t;
      for (const listener of listeners) {
        listener(t);
      }
    },
  };
  return clock;
}

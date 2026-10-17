// What's built of a desk, a stand-in for the desk's tests: each call recorded, by its address as text; a way in by its
// address and its input, as text.
class DeskBuiltStandIn {
  told = [];
  added = [];
  presets = [];
  tempi = [];
  placeholders = [];

  set(address, value, when = {}) {
    this.told.push([address.join('/'), value, when]);
  }
  add(copy) {
    this.added.push(copy.join('/'));
  }
  preset(values, settings) {
    this.presets.push([values, settings]);
  }
  tempo(beat) {
    this.tempi.push(beat);
  }
  wayInto(address, input = 'in') {
    return `into ${[...address, input].join('/')}`;
  }
  automate() {}
  stopBy() {}
  letGo() {}
  rebuild() {}
  faded() {
    return Infinity;
  }
  dispose() {}
}
// A setup of the test's own: a mute taking nothing along, no track live, nothing set by notes.
const SETUP = { mutedWith: (muted) => new Set(muted), isLive: () => false, setByNotes: () => false };

// A desk on a plan, made with a setup, a clock, a time on what's built's clock and its own times, the tests' own unless
// given; what's built of it once built, and what it's handed to build, kept.
export function deskOn(Desk, plan, { setup = SETUP, clock = clockAt(0), at = (t) => t, ownTime = () => false } = {}) {
  const desk = new Desk({ plan, setup: { ...SETUP, ...setup }, clock, at, ownTime });
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
export function clockAt(start) {
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

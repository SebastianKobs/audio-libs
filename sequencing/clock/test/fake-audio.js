// A stand-in audio context for a clock's tests, the clock's own (clock.test.js) and the tool's (mockup/test/unit/frame-time.test.js):
// it says what time it thinks it is

// stand-in audio contexts on a clock: each one's time runs `behind` the clock (or the one it's handed to, `of`), in blocks of `block` s,
// at `rate`, and only while it's running; one made `suspended` waits at time 0 until start() runs it from 0, as a
// new context does a little after the first press
export function fakeAudioOn(clock) {
  return function fakeAudio({
    behind = 3,
    block = 0,
    rate = 1,
    state = 'running',
    of = clock,
    suspended = false,
  } = {}) {
    const listeners = [];
    let t0 = of.now();
    let waiting = suspended;
    if (waiting) {
      state = 'suspended';
    }
    let frozenAt = null;
    let pausedFor = 0;
    const raw = () => (of.now() - t0) * rate + t0 - behind - pausedFor;
    return {
      get state() {
        return state;
      },
      get currentTime() {
        if (waiting) {
          return 0;
        }
        const c = frozenAt ?? raw();
        return block ? Math.floor(c / block) * block : c;
      },
      addEventListener(type, fn) {
        if (type === 'statechange') {
          listeners.push(fn);
        }
      },
      start() {
        waiting = false;
        t0 = of.now();
        behind = t0;
        state = 'running';
        listeners.forEach((fn) => fn());
      },
      suspend() {
        frozenAt = raw();
        state = 'suspended';
        listeners.forEach((fn) => fn());
      },
      resume() {
        pausedFor += raw() - frozenAt;
        frozenAt = null;
        state = 'running';
        listeners.forEach((fn) => fn());
      },
    };
  };
}

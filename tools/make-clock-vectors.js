// Writes test-vectors/clock/grid.json from the clock: where the 16ths of the beat grid sound, for tempos and swings. And
// clock/taps.json: where taps land on each tap grid, snapping to the next step or the nearest, straight or swung.
// The unit tests hold the clock to the vectors, so they're written again only on purpose:
// node tools/make-clock-vectors.js
import { Clock, COMMON_TIME, GRIDS } from '../sequencing/clock/index.ts';
import { roundedTo, table, written } from './vectors.js';

const r9 = roundedTo(9);
// the settings the clock reads live, as a tool starts them
const settings = { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16', meter: COMMON_TIME };
const clock = new Clock({ settings });

clock.useFake(0);
const cases = [];
for (const bpm of [50, 72, 90]) {
  for (const swingOn of ['16ths', '8ths']) {
    for (const swing of [0, 0.5, 1, 1.14, 2]) {
      Object.assign(settings, { bpm, swing, swingOn });
      const steps = Array.from({ length: 17 }, (_, k) => k);
      cases.push({
        bpm,
        swing,
        swingOn,
        steps,
        times: steps.map((s) => r9(clock.grid.timeAt(s) - clock.grid.timeAt(0))),
      });
    }
  }
}
const about =
  "Where the 16ths of the beat grid sound, with swing: seconds after the first 16th of a beat, for each tempo and swing. Written from the clock (mockup/src/libs/sequencing/clock/), on the tool's settings, by tools/make-clock-vectors.js.";
written('clock/grid.json', table({ about, cases }));
console.log(`${cases.length} cases`);

// taps: with no audio, the grid started with its first 16th, a beat, at 0, and a tap at t can sound at once; a grid not started stands at
// its first 16th, so it's started here, as the audio starts it
clock.grid.start(0);
const taps = Array.from({ length: 31 }, (_, k) => r9(k * 0.037));
const tapCases = [];
for (const swing of [0, 1.14]) {
  for (const quantize of Object.keys(GRIDS)) {
    for (const tapGrid of ['straight', 'swung']) {
      for (const tapSnap of ['next', 'nearest']) {
        Object.assign(settings, { bpm: 72, swing, swingOn: '8ths', quantize });
        const late = 0.05;
        const out = taps.map((t) => {
          clock.useFake(t);
          return clock.snap(t, { straight: tapGrid === 'straight', nearest: tapSnap === 'nearest', late });
        });
        tapCases.push({
          bpm: 72,
          swing,
          swingOn: '8ths',
          quantize,
          tapGrid,
          tapSnap,
          late,
          taps,
          at: out.map((o) => r9(o.at)),
          on: out.map((o) => r9(o.on)),
        });
      }
    }
  }
}
const tapsAbout =
  "Where a tap lands on each tap grid (tap quantize), snapping to the next step or the nearest, straight or swung: for each tap time, when it sounds (at) and the time of the step it belongs to (on), in seconds from a bar, where every grid meets. With nearest, the step just gone counts only for a tap at most late s after it (tap catch). The audio can start at once, so off sounds 5 ms after the tap, and so does a tap that belongs to the step just gone. Triplets are always straight. Written from the clock (mockup/src/libs/sequencing/clock/), on the tool's settings, by tools/make-clock-vectors.js.";
written('clock/taps.json', table({ about: tapsAbout, cases: tapCases }));
console.log(`${tapCases.length} tap cases`);

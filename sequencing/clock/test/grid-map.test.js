// Where each 16th fell (mockup/src/libs/sequencing/clock/grid-map.ts): a time's place on the grid as it was
// heard, the tempo as it was then, and back; a hold where no 16th fell taking no room; the 16ths
// skipped as the ticks lag counted; the grid held, the present standing still.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridMap } from '../index.ts';

// a clock as the arrangement hears it: the grid's 16ths handed on as they're scheduled, their straight times, and the tempo now
function fakeClock() {
  let heard = () => {};
  const holds = /** @type {{ from: number, to: number }[]} */ ([]); // each hold it went through
  const grid = { stepDuration: 0.25, at: 0, from: 0, heldAt: null, held: 0, holds };
  return {
    onStep: (listener) => {
      heard = listener;
    },
    grid: {
      straightTime: (place) => grid.at + (place - grid.from) * grid.stepDuration,
      straightAt: (t) =>
        grid.heldAt !== null && t >= grid.heldAt ? grid.held : grid.from + (t - grid.at) / grid.stepDuration,
      get heldAt() {
        return grid.heldAt;
      },
      stepDuration: () => grid.stepDuration,
      meter: () => [4, 4],
      stepsPerBeat: () => 4,
      stepsPerBar: () => 16,
      songTime: (t) =>
        grid.holds.reduce((song, { from, to }) => (t > from ? song - (Math.min(t, to) - from) : song), t),
      timeOfSong: (song) => grid.holds.reduce((t, { from, to }) => (t > from ? t + to - from : t), song),
    },
    holdsSoFar: grid.holds, // each hold it went through, for song time
    play(i, at, stepDuration) {
      Object.assign(grid, { at, from: i, stepDuration });
      heard(i, at);
    },
    hold(t, place) {
      Object.assign(grid, { heldAt: t, held: place });
    },
  };
}

test("a time's place on the grid as it was played: between two 16ths, as far as it lies between them, the tempo as it was then; past the last, at the tempo now", () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  for (let i = 0; i < 8; i++) {
    clock.play(i, i * 0.25, 0.25); // 16ths a quarter of a second long
  }
  for (let i = 8; i < 12; i++) {
    clock.play(i, 2 + (i - 8) * 0.125, 0.125); // twice as fast from the 8th
  }
  assert.equal(map.placeOf(0.5), 2, 'a 16th of the first tempo');
  assert.equal(map.placeOf(1.125), 4.5, 'halfway between two of them');
  assert.equal(map.placeOf(2.0625), 8.5, 'halfway between two of the second tempo');
  assert.equal(map.placeOf(2.5), 12, 'past the last, at the tempo now');
  assert.equal(map.stepsPerBar(), 16);
  assert.deepEqual(
    [2, 4.5, 8.5, 12].map((place) => map.timeOf(place)),
    [0.5, 1.125, 2.0625, 2.5],
    "and back, a place's time",
  );
});

// a playback across a stop or an earlier playback jumped there, its playhead with it: the hold, where no 16th fell, took the room of the
// 16th it came in (found after it was committed)
test('a hold where no 16th fell takes no room: the 16ths either side of it a 16th apart, a time within it where the grid stood, and back', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  clock.play(0, 0, 0.25);
  clock.play(1, 0.25, 0.25); // held from 0.5 s, where the 16th 2 would have fallen, to 3.5 s
  clock.holdsSoFar.push({ from: 0.5, to: 3.5 });
  clock.play(2, 3.5, 0.25);
  clock.play(3, 3.75, 0.25);
  assert.equal(map.placeOf(0.375), 1.5, 'before it, between two 16ths as ever');
  assert.equal(map.placeOf(0.45), 1.8, 'nearing it, as fast as ever, not stretched over it');
  assert.equal(map.placeOf(2), 2, 'within it, where the grid stood');
  assert.equal(map.placeOf(3.625), 2.5, 'after it');
  assert.equal(map.timeOf(1.8), 0.45, 'and back');
});

test('16ths skipped as the ticks lag: a time between those heard lies as far as it lies between them, the 16ths skipped counted, and back', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  clock.play(0, 0, 0.25);
  clock.play(1, 0.25, 0.25);
  clock.play(5, 1.25, 0.25); // 2 to 4 skipped, the page hidden
  clock.play(6, 1.5, 0.25);
  assert.equal(map.placeOf(0.75), 3);
  assert.equal(map.timeOf(3), 0.75);
});

test('the grid held, a time from the hold on lies at the place it was held at, the 16ths scheduled ahead of it not counted: the present stands still', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  for (let i = 0; i < 8; i++) {
    clock.play(i, i * 0.25, 0.25);
  }
  clock.hold(1.3, 5.2); // held at 1.3 s, at 16th 5.2, the 16ths to 7 scheduled ahead
  assert.equal(map.placeOf(1.6), 5.2, 'within the 16ths scheduled ahead: held');
  assert.equal(map.placeOf(9), 5.2, 'long after: held');
  assert.equal(map.placeOf(1), 4, 'before the hold: where it lay');
});

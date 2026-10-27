// Where each 16th fell (mockup/src/libs/sequencing/clock/grid-map.ts): a song time's place on the grid as it was
// heard, the tempo as it was then, and back; a hold where no 16th fell taking no room, as song time has it out;
// the 16ths skipped as the ticks lag counted; a locate, a jump in song time, kept apart: nothing stretched over it;
// the grid held, the present standing still.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridMap } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

// a clock as the arrangement hears it: the grid's 16ths handed on as they're scheduled, their straight times, and the tempo now
function fakeClock() {
  let heard = () => {};
  const holds = /** @type {{ from: number, to: number }[]} */ ([]); // each hold it went through
  const jumps = /** @type {{ at: number, by: number }[]} */ ([]); // each locate
  const grid = { stepDuration: 0.25, at: 0, from: 0, heldAt: null, held: 0, holds, jumps };
  const playedTime = (t) =>
    grid.holds.reduce((song, { from, to }) => (t > from ? song - (Math.min(t, to) - from) : song), t);
  const songTime = (t) => grid.jumps.reduce((song, { at, by }) => (t >= at ? song + by : song), playedTime(t));
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
      playedTime,
      songTime,
      timeOfSong: (song) => grid.holds.reduce((t, { from, to }) => (t > from ? t + to - from : t), song),
      locate: (song, t) => {
        grid.jumps.push({ at: t, by: song - songTime(t) });
      },
    },
    holdsSoFar: grid.holds, // each hold it went through, for song time
    // the song position set to a song time at a clock time: from then on, song time is that much further
    locate(song, t) {
      this.grid.locate(song, t);
    },
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
  assert.deepEqual(
    [2, 4.5, 8.5, 12].map((place) => map.timeOf(place)),
    [0.5, 1.125, 2.0625, 2.5],
    "and back, a place's time",
  );
});

// a playback across a stop or an earlier playback jumped there, its playhead with it: the hold, where no 16th fell, took the room of the
// 16th it came in. Its times are song time, the hold already out of them
test('a hold where no 16th fell takes no room: the 16ths either side of it a 16th apart in song time, and back', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  clock.play(0, 0, 0.25);
  clock.play(1, 0.25, 0.25); // held from 0.5 s, where the 16th 2 would have fallen, to 3.5 s
  clock.holdsSoFar.push({ from: 0.5, to: 3.5 });
  clock.play(2, 3.5, 0.25);
  clock.play(3, 3.75, 0.25);
  const song = (t) => clock.grid.songTime(t);
  assert.equal(map.placeOf(song(0.375)), 1.5, 'before it, between two 16ths as ever');
  assert.equal(map.placeOf(song(0.45)), 1.8, 'nearing it, as fast as ever, not stretched over it');
  assert.equal(map.placeOf(song(2)), 2, 'within it, where the grid stood');
  assert.equal(map.placeOf(song(3.625)), 2.5, 'after it');
  assert.equal(map.placeOf(0.625), 2.5, 'by its song time');
  assert.equal(map.timeOf(1.8), 0.45, 'and back, a song time');
  assert.equal(map.timeOf(2.5), 0.625, 'after it, its song time, not its clock time');
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

// a locate between two 16ths is a jump in song time: the 16ths before it keep their places, and the interval before it isn't stretched
// over the jump
test('a locate between two 16ths: those before it keep their places, the interval before it undistorted, a song time skipped placed from the 16th after it', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  for (let i = 0; i < 4; i++) {
    clock.play(i, i * 0.25, 0.25);
  }
  clock.locate(100, 0.9); // between the 16ths 3 (0.75 s) and 4 (1 s): song time 100.1 at 16th 4
  for (let i = 4; i < 8; i++) {
    clock.play(i, i * 0.25, 0.25);
  }
  assert.equal(map.placeOf(0.5), 2, 'before it, where it lay');
  assert.equal(map.placeOf(0.6), 2.4, 'the interval before it, as far as ever');
  assert.equal(map.placeOf(0.75), 3, 'the 16th before it');
  near(map.placeOf(100.1), 4, 'the 16th after it, in song time');
  near(map.placeOf(100.35), 5, 'and the next');
  near(map.placeOf(100), 3.6, 'a song time before it in the located line, as far as it lies from that 16th');
  near(map.placeOf(50), 4 - 50.1 / 0.25, 'skipped by the locate: counted back from the 16th after it at the tempo');
  assert.equal(map.timeOf(2.4), 0.6, 'and back, the interval before it');
  assert.equal(map.timeOf(3), 0.75);
  near(map.timeOf(5), 100.35, 'after it');
});

test('a locate back: a song time heard twice lies where it was heard last; one only heard before it where it was', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  for (let i = 0; i < 8; i++) {
    clock.play(i, i * 0.25, 0.25);
  }
  clock.locate(0.5, 1.9); // song time 0.6 at the 16th 8, at 2 s
  for (let i = 8; i < 12; i++) {
    clock.play(i, i * 0.25, 0.25);
  }
  near(map.placeOf(0.85), 9, 'heard again: the later pass');
  near(map.placeOf(1), 9.6, 'in the later pass');
  assert.equal(map.placeOf(0.3), 1.2, 'heard only before the locate: where it was');
  assert.equal(map.placeOf(1.5), 6, 'and one past the later pass');
  near(map.timeOf(9), 0.85, 'and back');
  assert.equal(map.timeOf(6), 1.5);
});

// a recording loaded: its song time 0 at place 0, whatever the page's age, so a file longer than the page's age isn't mostly before the
// grid's first 16th
test('started over at a song time: the runs from before let go, song time 0 at place 0, the present at the song time, the tempo now', () => {
  const clock = fakeClock();
  const map = new GridMap({ clock });
  for (let i = 0; i < 8; i++) {
    clock.play(i, i * 0.25, 0.25); // the page's 2 s, 16ths of a quarter second
  }
  clock.play(8, 2, 0.5); // the tempo now: a 16th of half a second
  map.startOver(10, 2.5); // a 10 s recording loaded, the grid at its place 9
  assert.equal(map.placeOf(0), 0, 'the file begins at the place 0');
  assert.equal(map.placeOf(10), 20, 'the present at its end');
  assert.equal(map.placeOf(3), 6, 'a song time before it, counted back at the tempo now, not from the runs before');
  assert.equal(map.timeOf(6), 3, 'and back');
  assert.equal(map.timeOf(0), 0);
  clock.play(9, 2.5, 0.5); // song time 10 at the grid's 16th 9, a place 20
  clock.play(10, 3, 0.5);
  assert.equal(map.placeOf(10), 20, 'live play after it: the 16ths laid out as heard');
  assert.equal(map.placeOf(10.25), 20.5, 'between them');
  assert.equal(map.timeOf(21), 10.5, 'and back');
  assert.equal(map.placeOf(3), 6, 'what lay before it where it was');
});

// phrasing's unit tests (mockup/src/libs/music/phrasing/): a speed for how fast you play and a line's feel,
// the transforms, on a grid of the tests' own
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answer,
  breath,
  feelFor,
  halfTime,
  holdLast,
  layBack,
  notesPerBeat,
  rephrase,
  slide,
  speedAt,
  speedFor,
} from '../index.ts';
import { STEP } from '../../../sequencing/clock/index.ts';
import { draws } from '../../../base/util/test/draws.js';

const grid = { stepAt: (t) => t * 8, timeAt: (step) => step / 8 }; // 16ths an 8th of a second apart, from 0, straight

test('a speed for how fast you play: the one of half, normal and double whose notes come closest, as a ratio, to your rate', () => {
  const every16th = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, i) => ({ start: i * STEP })) }; // 4 a beat
  assert.equal(speedFor(every16th, 4, 0.5, 1), 1, 'four a beat: normal');
  assert.equal(speedFor(every16th, 1.5, 1, 1), 0.5, "a beat's quarter turns half as many: half");
  assert.equal(speedFor(every16th, 7, 1, 1), 2, 'nearly twice as many: double');
  const sparse = { bars: 1, loop: true, events: [{ start: 0 }] }; // one a bar: a quarter a beat
  assert.equal(speedFor(sparse, 4, 1, 1), 2, 'as close as it gets: double');
});

test("a speed against a density of its own, the same for every rhythm, as a soloist's line takes it", () => {
  const stream = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, i) => ({ start: i * STEP })) };
  assert.equal(notesPerBeat(stream), 4);
  assert.equal(
    notesPerBeat({ meter: [3, 16], bars: 1, events: [{ start: 0 }, { start: 24 }] }),
    (2 * 96) / 72,
    'in its own meter',
  );
  assert.deepEqual(
    [1.5, 4, 7].map((rate) => speedAt(4, rate, 1, 1)),
    [0.5, 1, 2],
    'as if every rhythm were 16ths',
  );
  assert.equal(speedAt(4, 2.6, 1, 1.3), 1, 'with its hysteresis');
});

test("a line's feel for how fast it's played: half time below one speed, double above another, normal between, with hysteresis", () => {
  const at = { half: 0.5, double: 2 };
  assert.deepEqual(
    [0.3, 1, 3].map((speed) => feelFor(speed, 1, at, 1)),
    [0.5, 1, 2],
    'below, between, above',
  );
  assert.equal(feelFor(2.2, 1, at, 1.44), 1, 'just above double: not by the band, 1.2 times');
  assert.equal(feelFor(2.5, 1, at, 1.44), 2, 'clearly above: double');
  assert.equal(feelFor(1.8, 2, at, 1.44), 2, 'just under double: stays');
  assert.equal(feelFor(1.6, 2, at, 1.44), 1, 'clearly under: normal');
  assert.equal(feelFor(0.3, 2, at, 1.44), 0.5, 'straight from double to half');
  assert.equal(feelFor(0.55, 0.5, at, 1.44), 0.5, 'just above half: stays');
  assert.equal(feelFor(5, 0.5, at, 1.44), 2, 'straight from half to double');
});

test('a speed changes only once another is clearly closer, and stays when you stop', () => {
  const every16th = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, i) => ({ start: i * STEP })) };
  assert.equal(
    speedFor(every16th, 2.6, 1, 1.3),
    1,
    'half is closer to 2.6 a beat, but not by a ratio of 1.3: it stays',
  );
  assert.equal(speedFor(every16th, 2.4, 1, 1.3), 0.5, 'at 2.4 it is: half');
  assert.equal(speedFor(every16th, 3.1, 0.5, 1.3), 0.5, 'and back to normal only above about 3.2: closer, not clearly');
  assert.equal(speedFor(every16th, 3.4, 0.5, 1.3), 1);
  assert.equal(speedFor(every16th, 0, 2, 1.3), 2, 'not moving: as it was');
});

test('transforms, in ticks: the answer in the next bar, laid back, the last held, half time', () => {
  assert.equal(answer(0, grid), 2, 'the 16th 16 of a two-bar cycle');
  assert.equal(answer(3, grid), 6, 'the next one');
  const notes = () => [
    { start: 96, sounds: 0.2 },
    { start: 120, sounds: 0.2 },
    { start: 168, sounds: 0.2 },
  ];
  const laidBack = notes();
  layBack(laidBack, 48);
  assert.deepEqual(
    laidBack.map((note) => note.start),
    [144, 168, 216],
  );
  const held = notes();
  holdLast(held, 1);
  assert.deepEqual(
    held.map((note) => note.sounds),
    [0.2, 0.2, 1],
  );
  const slowed = notes();
  halfTime(slowed, 1.5);
  assert.deepEqual(
    slowed.map((note) => [note.start, +note.sounds.toFixed(3)]),
    [
      [96, 0.3],
      [144, 0.3],
      [240, 0.3],
    ],
  );
});

test('a breath leaves out one note from the middle, or two of six or more half the time; the first and last stay', () => {
  const line = (length) => Array.from({ length }, (_, i) => ({ start: i * STEP }));
  const ofFour = line(4);
  breath(ofFour, draws(0));
  assert.deepEqual(
    ofFour.map((note) => note.start / STEP),
    [0, 2, 3],
  );
  const twoOfSix = line(6);
  breath(twoOfSix, draws(0.2, 0.99));
  assert.deepEqual(
    twoOfSix.map((note) => note.start / STEP),
    [0, 1, 2, 5],
    'two, the last pair before the end',
  );
  const oneOfSix = line(6);
  breath(oneOfSix, draws(0.7, 0));
  assert.deepEqual(
    oneOfSix.map((note) => note.start / STEP),
    [0, 2, 3, 4, 5],
    'one',
  );
});

test('a rephrase puts the last phrase into another rhythm from a set: its first notes and its last, from its 8th', () => {
  const set = [
    {
      events: [
        { start: 0, duration: 48 },
        { start: 48, duration: 144 },
      ],
      vibrato: 16,
    },
    {
      events: [
        { start: 48, duration: 96 },
        { start: 144, duration: 48 },
        { start: 192, duration: 192 },
      ],
      vibrato: 8,
    },
  ];
  const notes = [
    { start: 0, phrase: 0, duration: 48 },
    { start: 120, phrase: 1, duration: 48, rhythmIndex: 0 },
    { start: 168, phrase: 1, duration: 48 },
    { start: 216, phrase: 1, duration: 48, rhythmIndex: 0 },
  ];
  rephrase(notes, set, draws(0), { soundsFor: (duration) => duration / 240 });
  assert.deepEqual(
    notes.map((note) => [note.start, note.duration, note.vibrato]),
    [
      [0, 48, undefined],
      [144, 96, 8],
      [240, 48, 8],
      [288, 192, 8],
    ],
    'not the rhythm it came from, from the 8th it started on, wherever the rhythm starts in its bar',
  );
  assert.equal(notes[3].sounds, 0.8);
});

test('a slide into a note the line arrives start: from below when it climbs, above when it falls', () => {
  const line = () => [
    { start: 0, deg: 0, duration: 48 },
    { start: 48, deg: 1, duration: 48 },
    { start: 96, deg: 4, duration: 48 },
    { start: 144, deg: 3, duration: 48 },
  ];
  const leap = line();
  slide(leap, draws(0.5)); // arrivals: the first, the leap to 4, the last
  assert.deepEqual(
    leap.map((note) => note.pitchBend),
    [undefined, undefined, -1, undefined],
    'the leap up: from below',
  );
  const falling = line();
  slide(falling, draws(0.99));
  assert.equal(falling[3].pitchBend, 1, 'the last, falling: from above');
  const first = line();
  slide(first, draws(0, 0.2));
  assert.equal(first[0].pitchBend, -1, 'the first, from nothing: at random');
  const afterRest = [
    { start: 0, deg: 0, duration: 24 },
    { start: 72, deg: 0, duration: 24 },
    { start: 96, deg: 1, duration: 144 },
    { start: 240, deg: 1, duration: 24 },
  ];
  slide(afterRest, draws(0.4, 0.2)); // arrivals: the first, after a rest of two 16ths, the long note, the last
  assert.equal(afterRest[1].pitchBend, -1, 'after a rest of two 16ths, staying: at random');
});

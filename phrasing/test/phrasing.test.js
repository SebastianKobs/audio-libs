// phrasing's unit tests (mockup/src/libs/phrasing/; the garden's until ZG41, the sequencer's until L1a;
// mockup/architecture/sequencer.md): a record kept up to its cap, a slice and whole phrases of it,
// a speed for how fast you play and a line's feel, the transforms, a run of notes unmuted,
// a bank and its cycle, on a grid of the tests' own
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answer,
  breath,
  cycleOf,
  feelFor,
  halfTime,
  holdLast,
  keep,
  layBack,
  notesPerBeat,
  patternsIn,
  phrases,
  rephrase,
  slice,
  slide,
  speedAt,
  speedFor,
  unmute,
} from '../index.ts';
import { STEP } from '../../clock/index.ts';

const draws = (...xs) => {
  let i = 0;
  return () => xs[i++];
}; // rand() giving these, in order
const grid = { stepAt: (t) => t * 8, timeAt: (s) => s / 8 }; // 16ths an 8th of a second apart, from 0, straight

test('a record keeps events up to its cap, and then none', () => {
  const r = [];
  assert.deepEqual(keep(r, { start: 0 }, 2), { start: 0 });
  keep(r, { start: 24 }, 2);
  assert.equal(keep(r, { start: 48 }, 2), null);
  assert.deepEqual(r, [{ start: 0 }, { start: 24 }]);
});

test('a slice: a random length from 1 to all of it, drawn first, from the start or from anywhere', () => {
  assert.deepEqual(slice(10, 'start', draws(0)), [0, 1]);
  assert.deepEqual(slice(10, 'start', draws(0.99)), [0, 10], 'all of it');
  assert.deepEqual(
    slice(10, 'random', draws(0.25, 0.5)),
    [4, 3],
    'three, from halfway through the eight places it can start',
  );
  assert.deepEqual(slice(10, 'random', draws(0.99, 0.5)), [0, 10]);
});

test('phrases: whole phrases, 1 up to all of them; a record not all in phrases is sliced', () => {
  const r = [0, 0, 1, 1, 1, 2].map((phrase, k) => ({ start: k * STEP, phrase }));
  assert.deepEqual(phrases(r, 'start', draws(0)), [0, 2], 'the first phrase');
  assert.deepEqual(phrases(r, 'start', draws(0.5)), [0, 5], 'two phrases');
  assert.deepEqual(phrases(r, 'random', draws(0, 0.99)), [5, 1], 'the last phrase alone');
  assert.deepEqual(phrases([{ start: 0, phrase: 0 }, { start: 24 }], 'start', draws(0.99)), [0, 2]);
});

test('a speed for how fast you play: the one of half, normal and double whose notes come closest, as a ratio, to your rate', () => {
  const r = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, k) => ({ start: k * STEP })) }; // every 16th: 4 a beat
  assert.equal(speedFor(r, 4, 0.5, 1), 1, 'four a beat: normal');
  assert.equal(speedFor(r, 1.5, 1, 1), 0.5, "a beat's quarter turns half as many: half");
  assert.equal(speedFor(r, 7, 1, 1), 2, 'nearly twice as many: double');
  const sparse = { bars: 1, loop: true, events: [{ start: 0 }] }; // one a bar: a quarter a beat
  assert.equal(speedFor(sparse, 4, 1, 1), 2, 'as close as it gets: double');
});

test("a speed against a density of its own, the same for every rhythm, as a soloist's line takes it", () => {
  const stream = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, k) => ({ start: k * STEP })) };
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
    [0.3, 1, 3].map((s) => feelFor(s, 1, at, 1)),
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
  const r = { bars: 1, loop: true, events: Array.from({ length: 16 }, (_, k) => ({ start: k * STEP })) };
  assert.equal(speedFor(r, 2.6, 1, 1.3), 1, 'half is closer to 2.6 a beat, but not by a ratio of 1.3: it stays normal');
  assert.equal(speedFor(r, 2.4, 1, 1.3), 0.5, 'at 2.4 it is: half');
  assert.equal(speedFor(r, 3.1, 0.5, 1.3), 0.5, 'and back to normal only above about 3.2: closer, not clearly');
  assert.equal(speedFor(r, 3.4, 0.5, 1.3), 1);
  assert.equal(speedFor(r, 0, 2, 1.3), 2, 'not moving: as it was');
});

test('transforms, in ticks: the answer in the next bar, laid back, the last held, half time', () => {
  assert.equal(answer(0, grid), 2, 'the 16th 16 of a two-bar cycle');
  assert.equal(answer(3, grid), 6, 'the next one');
  const notes = () => [
    { start: 96, sounds: 0.2 },
    { start: 120, sounds: 0.2 },
    { start: 168, sounds: 0.2 },
  ];
  const a = notes();
  layBack(a, 48);
  assert.deepEqual(
    a.map((q) => q.start),
    [144, 168, 216],
  );
  const b = notes();
  holdLast(b, 1);
  assert.deepEqual(
    b.map((q) => q.sounds),
    [0.2, 0.2, 1],
  );
  const c = notes();
  halfTime(c, 1.5);
  assert.deepEqual(
    c.map((q) => [q.start, +q.sounds.toFixed(3)]),
    [
      [96, 0.3],
      [144, 0.3],
      [240, 0.3],
    ],
  );
});

test('a breath leaves out one note from the middle, or two of six or more half the time; the first and last stay', () => {
  const line = (n) => Array.from({ length: n }, (_, k) => ({ start: k * STEP }));
  const a = line(4);
  breath(a, draws(0));
  assert.deepEqual(
    a.map((q) => q.start / STEP),
    [0, 2, 3],
  );
  const b = line(6);
  breath(b, draws(0.2, 0.99));
  assert.deepEqual(
    b.map((q) => q.start / STEP),
    [0, 1, 2, 5],
    'two, the last pair before the end',
  );
  const c = line(6);
  breath(c, draws(0.7, 0));
  assert.deepEqual(
    c.map((q) => q.start / STEP),
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
    notes.map((q) => [q.start, q.duration, q.vibrato]),
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
  const a = line();
  slide(a, draws(0.5)); // arrivals: the first, the leap to 4, the last
  assert.deepEqual(
    a.map((q) => q.pitchBend),
    [undefined, undefined, -1, undefined],
    'the leap up: from below',
  );
  const b = line();
  slide(b, draws(0.99));
  assert.equal(b[3].pitchBend, 1, 'the last, falling: from above');
  const c = line();
  slide(c, draws(0, 0.2));
  assert.equal(c[0].pitchBend, -1, 'the first, from nothing: at random');
  const d = [
    { start: 0, deg: 0, duration: 24 },
    { start: 72, deg: 0, duration: 24 },
    { start: 96, deg: 1, duration: 144 },
    { start: 240, deg: 1, duration: 24 },
  ];
  slide(d, draws(0.4, 0.2)); // arrivals: the first, after a rest of two 16ths, the long note, the last
  assert.equal(d[1].pitchBend, -1, 'after a rest of two 16ths, staying: at random');
});

test("a set of patterns' cycle: its longest pattern, in whole bars of the master's, at least one", () => {
  assert.equal(cycleOf([{ bars: 2 }, { meter: [3, 4], bars: 1 }]), 768, 'two bars of 4/4');
  assert.equal(
    cycleOf([
      { meter: [3, 4], bars: 1 },
      { meter: [9, 16], bars: 1 },
    ]),
    384,
    'under a bar: one bar',
  );
  assert.equal(cycleOf([{ meter: [3, 4], bars: 2 }]), 768, 'a bar and a half: two');
  assert.equal(cycleOf([]), 384, 'nothing: one bar');
  assert.equal(cycleOf([{ bars: 1 }], [3, 4]), 288, "in the master's own time signature");
  const bank = {
    ASK: { events: [] },
    WALKS: [[0, 1]],
    SETS: { a: [{ bars: 2, events: [] }, { events: [] }] },
    STYLES: { b: { duration: 2 } },
  };
  assert.equal(patternsIn(bank).length, 3, "a bank's patterns: anything with events, in it or in its sets");
});

test('a replay unmutes a run of notes: from the next one on, a random number of them, 1 up to all', () => {
  const pat = { bars: 1, loop: true, from: 0, events: [{ start: 0 }, { start: 96 }, { start: 240 }] };
  assert.deepEqual(
    unmute(pat, 100, draws(0)).map((n) => n.start),
    [240],
    'one note: the next',
  );
  assert.deepEqual(
    unmute(pat, 100, draws(0.99)).map((n) => n.start),
    [240, 384, 480],
    'all three, round the loop',
  );
});

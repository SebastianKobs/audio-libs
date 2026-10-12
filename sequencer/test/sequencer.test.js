// The generic sequencer's unit tests (mockup/src/libs/sequencer/, a package of its own since L1e, MIDI's part apart since S1d;
// mockup/architecture/sequencer.md): ticks, patterns and their lengths, a record as the pattern it is, placing and repeating on the grid in
// ticks, a rhythm played live and its speed, on a grid of the tests' own; their events carry a pitch or a step, passed on, never read. The
// garden's phrasing, once here, a theme's cycle and a replay's run among it, is its own (mockup/test/unit/phrasing.test.js). What the
// garden plays through it is held to the recordings (replays.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PPQ,
  STEP,
  barTicks,
  due,
  lengthOf,
  liveEvents,
  patternOf,
  place,
  placeOn,
  rescaled,
  underWayAt,
  startsBar,
  upcoming,
  whole,
} from '../index.ts';

const grid = { stepAt: (t) => t * 8, timeAt: (s) => s / 8 }; // 16ths an 8th of a second apart, from 0, straight

test('ticks: 96 to a quarter, so a 16th is 24, a 16th triplet 16 and an 8th triplet 32, all whole', () => {
  assert.equal(PPQ, 96);
  assert.equal(STEP, 24);
  assert.deepEqual([PPQ / 6, PPQ / 3], [16, 32]);
});

test("a pattern's length: its bars, in its own time signature, or the master's", () => {
  assert.equal(barTicks(), 384, 'a bar of 4/4');
  assert.deepEqual([barTicks([3, 4]), barTicks([2, 4]), barTicks([9, 16]), barTicks([6, 8])], [288, 192, 216, 288]);
  assert.equal(lengthOf({ bars: 2 }), 768);
  assert.equal(lengthOf({ meter: [3, 4], bars: 1 }), 288);
  assert.equal(lengthOf({}, [3, 4]), 288, "a bar of the master's, when it has no meter or bars of its own");
});

test("placing a pattern on the grid, in ticks: from the beat it starts on, or at its phrase's own place in the beat", () => {
  const at = place(144, 2, grid); // kept from tick 144, the 16th 6; starts on the beat at 2 s, the 16th 16
  assert.deepEqual([144, 168, 240].map(at), [2, 2.125, 2.5]);
  const own = place(144, 2, grid, 'phrase'); // 144 is two 16ths into its beat
  assert.deepEqual([144, 168].map(own), [2.25, 2.375]);
  assert.equal(place(16, 2, grid, 'phrase')(16), 2 + 16 / 24 / 8, "a triplet's place in the beat, whole in ticks");
  const swung = place(0, 0, { stepAt: (t) => t * 8, timeAt: (s) => s / 8 + (s % 2 ? 0.02 : 0) });
  assert.equal(swung(24), 0.145, 'with the swing as the grid has it now');
});

// a phrase sent as its events come due needs their places, not their times: worked out when each comes, with the grid as it is then (P3c2)
test('where a pattern lies on the grid, in 16ths, as place() times it: from the beat it starts on, or at its phrase’s own place in the beat', () => {
  const on = placeOn(144, 2, grid); // starts on the beat at 2 s, the 16th 16
  assert.deepEqual([144, 168, 240].map(on), [16, 17, 20]);
  assert.deepEqual([144, 168].map(placeOn(144, 2, grid, 'phrase')), [18, 19], 'two 16ths into its beat');
  assert.deepEqual(
    [144, 168, 240].map((at) => grid.timeAt(on(at))),
    [144, 168, 240].map(place(144, 2, grid)),
    "and place()'s times its places'",
  );
});

test('a repeating pattern plays its events in the 16ths they come round in, and in no other', () => {
  const brushes = {
    meter: [2, 4],
    bars: 1,
    loop: true,
    events: [
      { start: 0, duration: 24, pitch: 40 },
      { start: 96, duration: 24, pitch: 38 },
    ],
  };
  assert.deepEqual(
    [0, 4, 8, 12, 2, 7].map((i) => due(brushes, i).map((n) => n.pitch)),
    [[40], [38], [40], [38], [], []],
  );
  const bass = {
    bars: 2,
    loop: true,
    events: [
      { start: 0, step: 1 },
      { start: 720, step: 0 },
    ],
  };
  assert.deepEqual(
    [30, 62, 0, 32, 31, 1].map((i) => due(bass, i).map((n) => n.step)),
    [[0], [0], [1], [1], [], []],
    'on the "and" of 4 of the second bar, and on the one',
  );
  const triplets = { meter: [1, 4], bars: 1, loop: true, events: [{ start: 0 }, { start: 32 }, { start: 64 }] };
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => due(triplets, i).map((n) => n.offset)),
    [[0], [8], [16], []],
    'off the 16th: how far into it',
  );
});

test('a record as the pattern it is: from the one of the bar its first event fell in, in whole cycles, its events in time order', () => {
  const bar = 384;
  const b5 = 5 * bar; // the record keeps places from the grid's start
  const one = patternOf(
    [
      { start: b5 + 288, k: 0 },
      { start: b5 + 144, k: 1 },
    ],
    bar,
  );
  assert.deepEqual([one.from, one.bars, one.loop], [b5, 1, true]);
  assert.deepEqual(
    one.events.map((n) => [n.start, n.k]),
    [
      [144, 1],
      [288, 0],
    ],
    'beat 2 and its 8th, and beat 4, in their places in the bar',
  );
  assert.equal(
    patternOf([{ start: b5 + 336 }, { start: b5 + bar }, { start: b5 + bar + 96 }], 2 * bar).bars,
    2,
    'into the next bar: a cycle of two',
  );
  assert.equal(
    patternOf([{ start: b5 }, { start: b5 + 2 * bar + 24 }], 2 * bar).bars,
    4,
    'into the third bar: two cycles of two',
  );
  assert.equal(patternOf([{ start: b5 + 288, duration: 192 }], bar).bars, 2, 'a long event: as long as it lasts');
  assert.equal(patternOf([{ start: b5 + 360 }], bar).bars, 1, 'the last 16th of the bar is in it');
});

test("a looping pattern's next events from a place, round the loop, where each falls", () => {
  const pat = {
    bars: 1,
    loop: true,
    from: 1920,
    events: [
      { start: 144, k: 0 },
      { start: 288, k: 1 },
    ],
  };
  assert.deepEqual(
    upcoming(pat, 2120, 3).map((n) => [n.start, n.k]),
    [
      [2208, 1],
      [2448, 0],
      [2592, 1],
    ],
    'the next, then round the loop',
  );
  assert.deepEqual(
    upcoming(pat, 2064, 1).map((n) => n.start),
    [2064],
    'one on the place itself',
  );
  assert.deepEqual(
    upcoming(pat, 1920 + 10 * 384, 1).map((n) => n.start),
    [1920 + 10 * 384 + 144],
    'ten loops on, in the same place in the bar',
  );
  assert.deepEqual(upcoming({ ...pat, events: [] }, 2120, 2), [], 'nothing to play');
});

test("a pattern played whole, as a launched clip: from its first event to its last, starting in the beat it's given, each event in its place in the beat", () => {
  const pat = {
    bars: 1,
    loop: true,
    from: 1920,
    events: [
      { start: 144, k: 0 },
      { start: 288, k: 1, duration: 48 },
      { start: 336, k: 2 },
    ],
  }; // a beat 96 ticks
  assert.deepEqual(
    upcoming(pat, 2120, 3).map((n) => n.k),
    [1, 2, 0],
    'round the loop from where it is: mid-pattern, as a replay unmutes it',
  );
  assert.deepEqual(
    whole(pat, 2112).map((n) => [n.start, n.k]),
    [
      [2160, 0],
      [2304, 1],
      [2352, 2],
    ],
    'whole: its first in the beat at 2112, half a beat in as kept, the others as far from it',
  );
  assert.equal(whole(pat, 2112)[1].duration, 48, 'a long event as long');
  assert.deepEqual(whole({ ...pat, events: [] }, 2112), [], 'nothing to play');
});

test('a rhythm played live: from where it started, round its loop, its events in a stretch of the grid, each where it falls', () => {
  const r = {
    bars: 1,
    loop: true,
    events: [
      { start: 0, duration: 48 },
      { start: 144, duration: 48 },
      { start: 288, duration: 96 },
    ],
  };
  const start = 1944; // started on the 16th 81
  assert.deepEqual(
    liveEvents(r, start, 1, 1920, 2300).map((n) => [n.start, n.duration]),
    [
      [1944, 48],
      [2088, 48],
      [2232, 96],
    ],
    'nothing before it started',
  );
  assert.deepEqual(
    liveEvents(r, start, 1, 2300, 2500).map((n) => n.start),
    [2328, 2472],
    'round its loop: its one again a bar on',
  );
  assert.deepEqual(
    liveEvents(r, start, 1, 2088, 2089).map((n) => n.start),
    [2088],
    'from a place, on it; up to one, not on it',
  );
  assert.deepEqual(liveEvents(r, start, 1, 2089, 2232), [], 'nothing between its events');
  assert.deepEqual(liveEvents({ ...r, events: [] }, start, 1, 0, 4000), [], 'no events');
});

test("a rhythm's speed: double time halves its places and lengths, half time doubles them; one in its own meter loops at its length", () => {
  const r = {
    bars: 1,
    loop: true,
    events: [
      { start: 0, duration: 48 },
      { start: 144, duration: 48 },
    ],
  };
  assert.deepEqual(
    liveEvents(r, 0, 2, 0, 384).map((n) => [n.start, n.duration]),
    [
      [0, 24],
      [72, 24],
      [192, 24],
      [264, 24],
    ],
    'twice a bar',
  );
  assert.deepEqual(
    liveEvents(r, 0, 0.5, 0, 768).map((n) => [n.start, n.duration]),
    [
      [0, 96],
      [288, 96],
    ],
    'once in two bars',
  );
  const three = { meter: [3, 16], bars: 1, loop: true, events: [{ start: 0 }, { start: 24 }] };
  assert.deepEqual(
    liveEvents(three, 0, 1, 0, 384).map((n) => n.start / STEP),
    [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15],
    "three 16ths against the bar's 16",
  );
});

test("the event of a rhythm under way at a place, as what's left of it, so one coming in partway, as a soloist mid-note, takes it up at once", () => {
  const long = { bars: 1, loop: true, events: [{ start: 0, duration: 336 }] }; // one tone of 3½ beats a bar
  assert.deepEqual(
    underWayAt(long, 0, 1, 1000),
    { start: 1000, duration: 104 },
    'in the third bar, 232 ticks into its tone: the 104 left',
  );
  assert.deepEqual(
    underWayAt(long, 0, 0.5, 400),
    { start: 400, duration: 272 },
    'in half time, its tone two bars long',
  );
  assert.equal(underWayAt(long, 0, 1, 1110), undefined, 'in its breath: nothing');
  assert.equal(underWayAt(long, 0, 1, 1088), undefined, 'less than a 16th left: nothing, it waits for the next');
  assert.equal(
    underWayAt(long, 0, 1, 768),
    undefined,
    "an event starting on the place itself isn't under way yet: it comes as the next",
  );
});

test('a change of speed runs on where the rhythm had got to, with no jump', () => {
  const r = { bars: 1, loop: true, events: [{ start: 0 }, { start: 96 }, { start: 192 }, { start: 288 }] };
  const start = 24;
  const at = 96;
  const next = rescaled(start, 1, 2, at); // at normal from the 16th 1; double from the beat
  assert.equal(next, 60, 'as if it had always played double time from there');
  assert.deepEqual(
    liveEvents(r, next, 2, at, 384).map((n) => n.start),
    [108, 156, 204, 252, 300, 348],
    '24 ticks of it to the next event, 12 at double time, then every 8th',
  );
  assert.equal(rescaled(start, 1, 0.5, at), -48, 'half time: a start before it can be, which liveEvents() places from');
  assert.deepEqual(
    liveEvents(r, rescaled(start, 1, 0.5, at), 0.5, at, 600).map((n) => n.start),
    [144, 336, 528],
  );
});

test("a 16th that starts a bar, in its time signature: every 16th one in 4/4, the master's when none is given, every 12th in 3/4 (G0.1c)", () => {
  assert.deepEqual(
    [0, 1, 15, 16, 32].map((i) => startsBar(i)),
    [true, false, false, true, true],
  );
  assert.deepEqual(
    [0, 12, 16, 24].map((i) => startsBar(i, [3, 4])),
    [true, true, false, true],
  );
});

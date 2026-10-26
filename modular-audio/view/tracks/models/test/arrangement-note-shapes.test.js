// libs/modular-audio/view/tracks/models/arrangement/note-shapes.ts: a region's notes as drawn: each held at
// its pitch, pieces at each glide, a line for each move, a slide in from its bend; a held one open to now; a
// note kept whole past a hold (read from Arrangement.regions); the region's pitch range.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteShape, pitchRange } from '../index.ts';
import { arrangementOf, region } from './arrangement.js';

test("a note's shape: held at its pitch from its start to its end; one still held open to now; none that hasn't sounded yet", () => {
  assert.deepEqual(noteShape({ t: 1, duration: 0.5, pitch: 60 }, 10), {
    pieces: [{ from: 1, to: 1.5, pitch: 60 }],
    lines: [],
    slide: null,
    held: false,
  });
  assert.deepEqual(noteShape({ t: 1, pitch: 48 }, 4).pieces, [{ from: 1, to: 4, pitch: 48 }], 'held: open to now');
  assert.equal(noteShape({ t: 1, pitch: 48 }, 4).held, true);
  assert.deepEqual(
    noteShape({ t: 2, duration: 1, pitch: 60 }, 2.5).pieces,
    [{ from: 2, to: 2.5, pitch: 60 }],
    'sounding: to now',
  );
  assert.equal(noteShape({ t: 5, duration: 1, pitch: 60 }, 4), null, 'ahead of now: not yet');
  assert.equal(noteShape({ t: 1, duration: 1 }, 4), null, 'no pitch: nothing to draw');
});

test("a note's glides, its pitch's lane: a piece at each pitch it glides to, a line between them at the glide's time; a slide in from its bend, among its per-note controllers", () => {
  const shape = noteShape(
    {
      t: 1,
      pitch: 60,
      controllers: { bend: -1 },
      lanes: {
        pitch: [
          { value: 62, t: 2 },
          { value: 59, t: 3 },
        ],
      },
    },
    4,
  );
  assert.deepEqual(shape.pieces, [
    { from: 1, to: 2, pitch: 60 },
    { from: 2, to: 3, pitch: 62 },
    { from: 3, to: 4, pitch: 59 },
  ]);
  assert.deepEqual(shape.lines, [
    { t: 2, from: 60, to: 62 },
    { t: 3, from: 62, to: 59 },
  ]);
  assert.deepEqual(shape.slide, { t: 1, from: 59, to: 60 }, 'in from a semitone below');
  assert.deepEqual(
    noteShape({ t: 1, pitch: 60, lanes: { pitch: [{ value: 62, t: 5 }] } }, 4).pieces,
    [{ from: 1, to: 4, pitch: 60 }],
    'a glide ahead of now: not yet',
  );
});

// a note sent with its length rang on through a hold that came as it sounded, a stop's or the live garden's while the arrangement played
// back: drawn whole, its end where song time gets to its length past the hold, not cut where it began
test('a note sent with its length kept whole past a hold it rang through: its end where song time gets to its length; a held one, one with no end yet, one clear of the hold as they are', () => {
  // held from 5 s to 8 s
  const song = {
    toTimeline: (t) => (t <= 5 ? t : Math.max(5, t - 3)),
    fromTimeline: (s) => (s <= 5 ? s : s + 3),
  };
  const through = { t: 4, pitch: 60, duration: 2 };
  const held = { t: 4.5, pitch: 62, duration: 4.5, held: true };
  const open = { t: 4.5, pitch: 62 };
  const clear = { t: 1, pitch: 60, duration: 1 };
  const { arrangement } = arrangementOf({
    regions: [region('tap', 0, {}, { notes: [through, held, open, clear] })],
    song,
  });
  arrangement.show(true);
  const [placed] = arrangement.regions;
  assert.deepEqual(placed.notes[0], { t: 4, pitch: 60, duration: 5 }, 'to 9 s, 2 s of song');
  assert.equal(placed.notes[1], held, 'held: where it was let go');
  assert.equal(placed.notes[2], open, 'held still');
  assert.deepEqual(placed.notes[3], clear, 'clear of the hold');
  assert.equal(placed.to, 9, "the region ends where its last note's kept length does");
});

test("a region's pitch range: its notes' lowest to highest, what they slide in from and glide to among them; none without pitches", () => {
  assert.deepEqual(
    pitchRange([
      { t: 1, pitch: 60, controllers: { bend: -2 } },
      { t: 2, pitch: 64, lanes: { pitch: [{ value: 67, t: 3 }] } },
    ]),
    [58, 67],
  );
  assert.equal(pitchRange([{ t: 1 }]), null);
});

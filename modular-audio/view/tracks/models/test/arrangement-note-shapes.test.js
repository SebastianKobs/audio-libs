// modular-audio/view/tracks/models/arrangement/note-shapes.ts: a region's notes as drawn: each held at
// its pitch, pieces at each glide, a line for each move, a slide in from its bend; a held one open to now; a
// note as recorded in song time (read from Arrangement.regions); the region's pitch range.
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

// the recording is in song time, so a note that rang on through a hold, a stop's or the live garden's while the arrangement played back,
// is whole as recorded: drawn as it is, no second turn through the clock's holds
test("a region's notes drawn as recorded, in song time: a note's length and a region's end as the recorder kept them", () => {
  const through = { t: 4, pitch: 60, duration: 5 };
  const held = { t: 4.5, pitch: 62, duration: 4.5, held: true };
  const open = { t: 4.5, pitch: 62 };
  const { arrangement } = arrangementOf({
    regions: [region('tap', 0, {}, { notes: [through, held, open], to: 9.5 })],
  });
  arrangement.show(true);
  const [placed] = arrangement.regions;
  assert.deepEqual(placed.notes, [through, held, open], 'as they are');
  assert.equal(placed.to, 9.5, "the region's end as recorded");
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

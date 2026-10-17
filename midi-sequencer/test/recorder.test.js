// The recorder (G1b, mockup/architecture/done.md), as Ableton records the session into its arrangement: every play the stream carries
// into the region it's of (G1a), told apart by its element and its number, a play with none a region of its own; a play its sender
// leaves out (unrecorded), left out; a region from its first note to the end of its last, one with a held note open until its element's next region begins; the
// last 30 minutes kept. And what moves as it's heard, as automation (G3b): a track's controllers as its lanes, a note's changes on the note,
// every change kept but a point that changes nothing
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Recorder } from '../recorder.ts';

const flower = { kind: 'tap' };
const bloom = { kind: 'bloom' };
const bass = { kind: 'bass' };
// a play of an element's, its notes at times, a 16th long unless they say
const play = (owner, region, notes, more = {}) => ({
  owner,
  kind: owner.kind,
  role: owner.kind,
  live: false,
  notes: notes.map((note) => (typeof note === 'number' ? { t: note, pitch: 60, duration: 0.2 } : note)),
  ...(region === undefined ? {} : { region }),
  ...more,
});
const spans = (regions) => regions.map((region) => [region.owner, region.from, region.to, region.notes.length]);

test("a replay, one play with all its notes: one region, from its first note to the end of its last, with its track, its track's name and until; what it drew its track's controllers, none of the region's (LAY14b)", () => {
  const recorder = new Recorder();
  recorder.heard(play(flower, 1, [1, 1.5, 2], { track: 0, trackName: 'replay tap 1', until: 4 }));
  const [region] = recorder.regions(5);
  assert.deepEqual(
    { ...region, notes: region.notes.length },
    {
      owner: flower,
      clip: flower,
      kind: 'tap',
      role: 'tap',
      live: false,
      track: 0,
      trackName: 'replay tap 1',
      until: 4,
      notes: 3,
      from: 1,
      to: 2.2,
    },
  );
});

test("your playing, a play a note: a gesture's notes one region, the next gesture's on the same flower another", () => {
  const recorder = new Recorder();
  for (const t of [1, 1.25, 1.5]) {
    recorder.heard(play(flower, 4, [t], { live: true }));
  }
  recorder.heard(play(flower, 5, [3], { live: true }));
  assert.deepEqual(spans(recorder.regions(4)), [
    [flower, 1, 1.7, 3],
    [flower, 3, 3.2, 1],
  ]);
});

test("a loop, a play a note: one region while it loops, launched again another; a launched clip's plays left out; a play with no region one of its own", () => {
  const recorder = new Recorder();
  for (const t of [0, 1, 2]) {
    recorder.heard(play(bass, 1, [t], { track: 3, until: Infinity }));
  }
  recorder.heard(play(bass, 2, [3], { track: 3, until: Infinity }));
  recorder.heard(play(flower, 9, [3.5], { launched: true, unrecorded: true }));
  recorder.heard(play(flower, undefined, [4]));
  recorder.heard(play(flower, undefined, [4.5]));
  assert.deepEqual(spans(recorder.regions(5)), [
    [bass, 0, 2.2, 3],
    [bass, 3, 3.2, 1],
    [flower, 4, 4.2, 1],
    [flower, 4.5, 4.7, 1],
  ]);
});

test("a held note (G2a): its region open until its note off comes as a play of its own, by the note's index, ended there; its glides, its pitch's changes, its pitch's lane (DRY7)", () => {
  const recorder = new Recorder();
  recorder.heard(play(bloom, 1, [{ t: 2, pitch: 48, index: 7 }], { live: true }));
  assert.deepEqual(spans(recorder.regions(10)), [[bloom, 2, Infinity, 1]], 'open while held');
  const glide = { type: 'per-note controller', index: 7, controller: 'pitch', value: 50, t: 11 };
  recorder.heard(play(bloom, 1, [], { live: true, changes: [glide] }));
  recorder.heard(play(bloom, 1, [], { live: true, ends: [{ index: 7, t: 12 }] }));
  const [region] = recorder.regions(13);
  assert.deepEqual([region.from, region.to], [2, 12]);
  assert.deepEqual(region.notes[0], {
    t: 2,
    pitch: 48,
    index: 7,
    duration: 10,
    held: true,
    lanes: { pitch: [{ value: 50, t: 11 }] },
  });
});

// a note sent with its length sounds that long whatever holds come, a held one until its note off came: told apart, so a hold in the
// recording keeps the one whole (P3c1, mockup/architecture/done.md)
test('a note with no length as it comes marked held, its end told after it; one sent with its length not', () => {
  const recorder = new Recorder();
  recorder.heard(play(bloom, 1, [{ t: 2, pitch: 48, index: 7 }], { live: true }));
  recorder.heard(play(flower, 2, [{ t: 3, pitch: 60, index: 8, duration: 0.2 }]));
  const [held, sent] = recorder.regions(4);
  assert.deepEqual([held.notes[0].held, sent.notes[0].held], [true, undefined]);
});

test("a held part's key changes (G2a): the notes let go there end in the old region; a note held through ends there too and starts again in the new, as it sounds on", () => {
  const recorder = new Recorder();
  const drone = { kind: 'ambient' };
  const part = { track: 0, until: Infinity };
  recorder.heard(
    play(
      drone,
      1,
      [
        { t: 5, pitch: 38, index: 1 },
        { t: 5, pitch: 45, index: 2 },
      ],
      part,
    ),
  );
  recorder.heard(play(drone, 2, [{ t: 10, pitch: 31, index: 3 }], { ...part, ends: [{ index: 2, t: 10 }] }));
  const [before, after] = recorder.regions(11);
  assert.deepEqual(
    [before.from, before.to, before.notes.map((note) => [note.pitch, note.duration])],
    [
      5,
      10,
      [
        [38, 5],
        [45, 5],
      ],
    ],
  );
  assert.deepEqual(
    [after.from, after.to, after.notes.map((note) => [note.pitch, note.t, note.duration])],
    [
      10,
      Infinity,
      [
        [31, 10, undefined],
        [38, 10, undefined],
      ],
    ],
    'the new chord, and the D held through, from the change',
  );
});

test("the last 30 minutes kept: a region ended before then let go; a long loop's notes before then let go, its region from its oldest kept", () => {
  const recorder = new Recorder();
  recorder.heard(play(flower, 1, [10]));
  for (let t = 0; t <= 2000; t += 100) {
    recorder.heard(play(bass, 1, [t], { track: 3, until: Infinity }));
  }
  const kept = recorder.regions(2000);
  assert.deepEqual(
    spans(kept),
    [[bass, 200, 2000.2, 19]],
    'the flower gone, the loop from 200 s: 30 minutes before 2000 s is 200 s',
  );
});

// a track's own controllers, a play of their own on it, no element's (G3a): its kind and number, as its replays have them
const controls = (kind, track, changes) => ({
  owner: null,
  kind,
  role: kind,
  live: false,
  notes: [],
  track,
  trackName: `replay ${kind} ${track + 1}`,
  controls: changes,
});
const point = (t, value, glide) => (glide === undefined ? { t, value } : { t, value, glide });
const pointsOf = (lanes, kind, track, controller) =>
  lanes.find((lane) => lane.kind === kind && lane.track === track && lane.controller === controller)?.points;

test("a track's controller changes kept as its lanes (G3b): a lane a controller, by the track's kind and number as its regions have them and its name as they were sent to it, each point a value at a time, jumping there or gliding by its time constant", () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('tap', 0, [
      { controller: 'volume', value: 0.8, t: 1 },
      { controller: 'air', value: 3000, t: 1 },
    ]),
  );
  recorder.heard(controls('tap', 0, [{ controller: 'air', value: 2000, t: 1.5, glide: 0.08 }]));
  recorder.heard(controls('vine', 1, [{ controller: 'air', value: 900, t: 1.2 }]));
  assert.deepEqual(recorder.lanes(1.6), [
    { kind: 'tap', track: 0, trackName: 'replay tap 1', controller: 'volume', points: [point(1, 0.8)] },
    {
      kind: 'tap',
      track: 0,
      trackName: 'replay tap 1',
      controller: 'air',
      points: [point(1, 3000), point(1.5, 2000, 0.08)],
    },
    { kind: 'vine', track: 1, trackName: 'replay vine 2', controller: 'air', points: [point(1.2, 900)] },
  ]);
  assert.deepEqual(recorder.regions(1.6), [], 'no region: no element, no notes');
});

test("a lane's points in time order, as Web Audio plays them: a glide sent now comes before a point set for later, sent first", () => {
  const recorder = new Recorder();
  recorder.heard(controls('tap', 0, [{ controller: 'level', value: 1, t: 4 }]));
  recorder.heard(controls('tap', 0, [{ controller: 'level', value: 0.5, t: 2, glide: 0.08 }]));
  recorder.heard(controls('tap', 0, [{ controller: 'level', value: 0.7, t: 4 }]));
  assert.deepEqual(
    pointsOf(recorder.lanes(2), 'tap', 0, 'level'),
    [point(2, 0.5, 0.08), point(4, 1), point(4, 0.7)],
    'one at the same time after it, as Web Audio places it',
  );
});

test('a point that changes nothing thinned once a second past (G3b): a jump to the value the jump before set, a glide to the value the glide before went to by its time constant; one changing the value or the way kept', () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('tap', 0, [
      { controller: 'air', value: 18000, t: 1 },
      { controller: 'air', value: 18000, t: 2 },
      { controller: 'air', value: 18000, t: 3, glide: 0.08 },
      { controller: 'air', value: 18000, t: 4, glide: 0.08 },
      { controller: 'air', value: 18000, t: 5, glide: 0.2 },
      { controller: 'air', value: 9000, t: 6 },
    ]),
  );
  assert.deepEqual(pointsOf(recorder.lanes(10), 'tap', 0, 'air'), [
    point(1, 18000),
    point(3, 18000, 0.08),
    point(5, 18000, 0.2),
    point(6, 9000),
  ]);
});

test('a point not yet a second past kept as it came, so one coming between it and the one before is never lost', () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('tap', 0, [
      { controller: 'level', value: 1, t: 5 },
      { controller: 'level', value: 1, t: 6 },
    ]),
  );
  assert.deepEqual(pointsOf(recorder.lanes(4.5), 'tap', 0, 'level'), [point(5, 1), point(6, 1)], 'both ahead: kept');
  recorder.heard(controls('tap', 0, [{ controller: 'level', value: 0.4, t: 5.5, glide: 0.08 }]));
  assert.deepEqual(
    pointsOf(recorder.lanes(10), 'tap', 0, 'level'),
    [point(5, 1), point(5.5, 0.4, 0.08), point(6, 1)],
    'back to 1 at 6 s, as it was heard',
  );
});

test('the last 30 minutes kept for a lane too: its points before them let go but its last, its value as they start', () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('tower', 2, [
      { controller: 'dull', value: 0.3, t: 10 },
      { controller: 'dull', value: 0.6, t: 100 },
    ]),
  );
  recorder.heard(controls('tower', 2, [{ controller: 'dull', value: 0.2, t: 1900 }]));
  assert.deepEqual(pointsOf(recorder.lanes(2000), 'tower', 2, 'dull'), [point(100, 0.6), point(1900, 0.2)]);
});

test("a note's changes after it kept on it (G3b), its own lanes, on its element's latest note of that index; thinned the same way, the first against its value as it starts", () => {
  const recorder = new Recorder();
  const tap = (t, index) => ({ t, pitch: 60, duration: 0.2, index, controllers: { volume: 0.5, pan: 0.2 } });
  recorder.heard(play(flower, 1, [tap(1, 3)], { live: true }));
  recorder.heard(play(flower, 2, [tap(2, 3)], { live: true }));
  recorder.heard(
    play(flower, 2, [], {
      live: true,
      changes: [
        { index: 3, controller: 'volume', value: 0.5, t: 2.1 },
        { index: 3, controller: 'volume', value: 0.4, t: 2.2, glide: 0.08 },
        { index: 3, controller: 'pan', value: 0.3, t: 2.2, glide: 0.08 },
      ],
    }),
  );
  const [first, second] = recorder.regions(10);
  assert.equal(first.notes[0].lanes, undefined, 'the earlier note of that index: none');
  assert.deepEqual(second.notes[0].controllers, { volume: 0.5, pan: 0.2 }, 'its values as it starts, as they came');
  assert.deepEqual(second.notes[0].lanes, { volume: [point(2.2, 0.4, 0.08)], pan: [point(2.2, 0.3, 0.08)] });
});

test("a held note carried into its element's next region carries its values as they are then; its changes before stay with the old", () => {
  const recorder = new Recorder();
  const held = { t: 1, pitch: 50, index: 4, controllers: { volume: 0.5 } };
  recorder.heard(play(bloom, 1, [held], { live: true }));
  recorder.heard(play(bloom, 1, [], { live: true, changes: [{ index: 4, controller: 'volume', value: 0.3, t: 2 }] }));
  recorder.heard(play(bloom, 2, [{ t: 3, pitch: 52, index: 5 }], { live: true }));
  recorder.heard(play(bloom, 2, [], { live: true, changes: [{ index: 4, controller: 'volume', value: 0.2, t: 4 }] }));
  const [before, after] = recorder.regions(10);
  assert.deepEqual(before.notes[0].lanes, { volume: [point(2, 0.3)] });
  const carried = after.notes.find((note) => note.index === 4);
  assert.deepEqual(carried.controllers, { volume: 0.3 }, 'as it sounded at the change');
  assert.deepEqual(carried.lanes, { volume: [point(4, 0.2)] });
});

test("a play its sender leaves out of the recording left out, whatever it carries: what's played back isn't recorded again (P3a), the live garden's held notes hushed and brought back as the arrangement plays back aren't what was played (P3b)", () => {
  const recorder = new Recorder();
  recorder.heard(play(flower, 1, [1, 2], { playback: true, unrecorded: true }));
  recorder.heard(play(flower, 2, [3]));
  assert.deepEqual(spans(recorder.regions(10)), [[flower, 3, 3.2, 1]], 'its notes');
  recorder.heard(play(flower, 3, [{ t: 4, pitch: 60, index: 4 }]));
  recorder.heard({
    owner: flower,
    kind: 'tap',
    notes: [],
    changes: [{ type: 'per-note controller', index: 4, controller: 'volume', value: 0, t: 5 }],
    unrecorded: true,
  });
  assert.equal(recorder.regions(10)[1].notes[0].lanes, undefined, 'its changes');
});

// a trace that winds into a tower ends its vine's held note at once, which may not have started yet, as John Supreme plays a phrase's note
// on the next 16th: its note off for a time before its note on's. Kept with a length below nothing, it was played back held to the end
// of what was recorded (KNOWN_BUGS.md, 2026-10-12)
test('a held note let go before it sounded, its note off for a time before its note on: kept at its start with no length, never less', () => {
  const recorder = new Recorder();
  const vine = { kind: 'vine' };
  recorder.heard(play(vine, 1, [{ t: 5, pitch: 60, index: 3 }], { live: true }));
  recorder.heard(play(vine, 1, [], { live: true, ends: [{ index: 3, t: 4.9 }] }));
  const [region] = recorder.regions(6);
  assert.equal(region.notes[0].duration, 0);
  assert.deepEqual([region.from, region.to], [5, 5]);
});

test("a note's glides sent with it kept as its pitch's lane, a value at each time, as its changes after it are (DRY7)", () => {
  const recorder = new Recorder();
  recorder.heard(play(flower, 1, [{ t: 2, pitch: 60, duration: 2, index: 3, glides: [[2.5, 62]] }]));
  const [note] = recorder.regions(5)[0].notes;
  assert.deepEqual([note.glides, note.lanes], [undefined, { pitch: [{ value: 62, t: 2.5 }] }]);
});

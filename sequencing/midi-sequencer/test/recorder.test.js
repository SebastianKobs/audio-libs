// The recorder (sequencing/midi-sequencer/recorder.ts): every play the stream carries kept as the
// region it's of, and what moves as it's heard as lanes, for the last 30 minutes; the timeline keeps and thins them
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Recorder } from '../index.ts';

const light = { kind: 'light' };
const pad = { kind: 'pad' };
const bass = { kind: 'bass' };
const string = { kind: 'string' };
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

test("a replayed play with all its notes: one region, from its first note to the end of its last, with its track, its track's name and until; what it drew its track's controllers, none of the region's", () => {
  const recorder = new Recorder();
  recorder.heard(play(light, 1, [1, 1.5, 2], { track: 0, trackName: 'track 1', until: 4 }));
  const [region] = recorder.regions(5);
  assert.deepEqual(
    { ...region, notes: region.notes.length },
    {
      owner: light,
      clip: light,
      kind: 'light',
      role: 'light',
      live: false,
      track: 0,
      trackName: 'track 1',
      until: 4,
      notes: 3,
      from: 1,
      to: 2.2,
    },
  );
});

test('live playing, a play a note: a run of notes one region, the next run on the same light another', () => {
  const recorder = new Recorder();
  for (const t of [1, 1.25, 1.5]) {
    recorder.heard(play(light, 4, [t], { live: true }));
  }
  recorder.heard(play(light, 5, [3], { live: true }));
  assert.deepEqual(spans(recorder.regions(4)), [
    [light, 1, 1.7, 3],
    [light, 3, 3.2, 1],
  ]);
});

test('a loop, a play a note: one region while it loops, started again another; a play with no region one of its own', () => {
  const recorder = new Recorder();
  for (const t of [0, 1, 2]) {
    recorder.heard(play(bass, 1, [t], { track: 3, until: Infinity }));
  }
  recorder.heard(play(bass, 2, [3], { track: 3, until: Infinity }));
  recorder.heard(play(light, undefined, [4]));
  recorder.heard(play(light, undefined, [4.5]));
  assert.deepEqual(spans(recorder.regions(5)), [
    [bass, 0, 2.2, 3],
    [bass, 3, 3.2, 1],
    [light, 4, 4.2, 1],
    [light, 4.5, 4.7, 1],
  ]);
});

// a note sent with its length sounds that long whatever holds come, a held one until its note off came: told apart, so a hold in the
// recording keeps the one whole. A note's end may come for a time before its start, a note still to sound ended by its sender (2026-10-12):
// kept at its start with no length, never less, or playback held it to the end of what was recorded
test("a held note: its region open until its note off comes as a play of its own, by the note's index, ended there; its glides, its pitch's changes, its pitch's lane; marked held, one sent with its length not; one ended before it starts kept at its start, no length", () => {
  const recorder = new Recorder();
  recorder.heard(play(pad, 1, [{ t: 2, pitch: 48, index: 7 }], { live: true }));
  assert.deepEqual(spans(recorder.regions(10)), [[pad, 2, Infinity, 1]], 'open while held');
  const glide = { type: 'per-note controller', index: 7, controller: 'pitch', value: 50, t: 11 };
  recorder.heard(play(pad, 1, [], { live: true, changes: [glide] }));
  recorder.heard(play(pad, 1, [], { live: true, ends: [{ index: 7, t: 12 }] }));
  recorder.heard(play(light, 2, [{ t: 3, pitch: 60, index: 8, duration: 0.2 }]));
  recorder.heard(play(string, 3, [{ t: 5, pitch: 60, index: 3 }], { live: true }));
  recorder.heard(play(string, 3, [], { live: true, ends: [{ index: 3, t: 4.9 }] }));
  const [region, sent, early] = recorder.regions(13);
  assert.deepEqual([region.from, region.to], [2, 12]);
  assert.deepEqual(region.notes[0], {
    t: 2,
    pitch: 48,
    index: 7,
    duration: 10,
    held: true,
    lanes: { pitch: [{ value: 50, t: 11 }] },
  });
  assert.equal(sent.notes[0].held, undefined, 'one sent with its length: not held');
  assert.equal(early.notes[0].duration, 0);
  assert.deepEqual([early.from, early.to], [5, 5]);
});

test("a held part's key changes: the notes let go there end in the old region; a note held through ends there too and starts again in the new, as it sounds on", () => {
  const recorder = new Recorder();
  const drone = { kind: 'drone' };
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
  recorder.heard(play(light, 1, [10]));
  for (let t = 0; t <= 2000; t += 100) {
    recorder.heard(play(bass, 1, [t], { track: 3, until: Infinity }));
  }
  const kept = recorder.regions(2000);
  assert.deepEqual(
    spans(kept),
    [[bass, 200, 2000.2, 19]],
    'the light gone, the loop from 200 s: 30 minutes before 2000 s is 200 s',
  );
});

// a track's own controllers, a play of their own on it, no element's: its kind and number, as a replayed play has them
const controls = (kind, track, changes) => ({
  owner: null,
  kind,
  role: kind,
  live: false,
  notes: [],
  track,
  trackName: `${kind} ${track + 1}`,
  controls: changes,
});
const point = (t, value, glide) => (glide === undefined ? { t, value } : { t, value, glide });
const pointsOf = (lanes, kind, track, controller) =>
  lanes.find((lane) => lane.kind === kind && lane.track === track && lane.controller === controller)?.points;

test("a track's controller changes kept as its lanes: a lane a controller, by the track's kind and number as its regions have them and its name as they were sent to it, each point a value at a time, jumping there or gliding by its time constant", () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('lead', 0, [
      { controller: 'volume', value: 0.8, t: 1 },
      { controller: 'air', value: 3000, t: 1 },
    ]),
  );
  recorder.heard(controls('lead', 0, [{ controller: 'air', value: 2000, t: 1.5, glide: 0.08 }]));
  recorder.heard(controls('bowed', 1, [{ controller: 'air', value: 900, t: 1.2 }]));
  assert.deepEqual(recorder.lanes(1.6), [
    { kind: 'lead', track: 0, trackName: 'lead 1', controller: 'volume', points: [point(1, 0.8)] },
    {
      kind: 'lead',
      track: 0,
      trackName: 'lead 1',
      controller: 'air',
      points: [point(1, 3000), point(1.5, 2000, 0.08)],
    },
    { kind: 'bowed', track: 1, trackName: 'bowed 2', controller: 'air', points: [point(1.2, 900)] },
  ]);
  assert.deepEqual(recorder.regions(1.6), [], 'no region: no element, no notes');
});

test('a point that changes nothing thinned once a second past: a jump to the value the jump before set, a glide to the value the glide before went to by its time constant; one changing the value or the way kept', () => {
  const recorder = new Recorder();
  recorder.heard(
    controls('lead', 0, [
      { controller: 'air', value: 18000, t: 1 },
      { controller: 'air', value: 18000, t: 2 },
      { controller: 'air', value: 18000, t: 3, glide: 0.08 },
      { controller: 'air', value: 18000, t: 4, glide: 0.08 },
      { controller: 'air', value: 18000, t: 5, glide: 0.2 },
      { controller: 'air', value: 9000, t: 6 },
    ]),
  );
  assert.deepEqual(pointsOf(recorder.lanes(10), 'lead', 0, 'air'), [
    point(1, 18000),
    point(3, 18000, 0.08),
    point(5, 18000, 0.2),
    point(6, 9000),
  ]);
});

test("a note's changes after it kept on it, its own lanes, on its element's latest note of that index; thinned the same way, the first against its value as it starts", () => {
  const recorder = new Recorder();
  const struck = (t, index) => ({ t, pitch: 60, duration: 0.2, index, controllers: { volume: 0.5, pan: 0.2 } });
  recorder.heard(play(light, 1, [struck(1, 3)], { live: true }));
  recorder.heard(play(light, 2, [struck(2, 3)], { live: true }));
  recorder.heard(
    play(light, 2, [], {
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
  recorder.heard(play(pad, 1, [held], { live: true }));
  recorder.heard(play(pad, 1, [], { live: true, changes: [{ index: 4, controller: 'volume', value: 0.3, t: 2 }] }));
  recorder.heard(play(pad, 2, [{ t: 3, pitch: 52, index: 5 }], { live: true }));
  recorder.heard(play(pad, 2, [], { live: true, changes: [{ index: 4, controller: 'volume', value: 0.2, t: 4 }] }));
  const [before, after] = recorder.regions(10);
  assert.deepEqual(before.notes[0].lanes, { volume: [point(2, 0.3)] });
  const carried = after.notes.find((note) => note.index === 4);
  assert.deepEqual(carried.controllers, { volume: 0.3 }, 'as it sounded at the change');
  assert.deepEqual(carried.lanes, { volume: [point(4, 0.2)] });
});

test("a play its sender leaves out of the recording left out, whatever it carries: what's played back isn't recorded again, the live held notes hushed and brought back as the recording plays back aren't what was played; one its owner says to leave out left out too", () => {
  const recorder = new Recorder();
  recorder.heard(play(light, 1, [1, 2], { playback: true, unrecorded: true }));
  recorder.heard(play(light, 2, [3]));
  assert.deepEqual(spans(recorder.regions(10)), [[light, 3, 3.2, 1]], 'its notes');
  recorder.heard(play(light, 3, [{ t: 4, pitch: 60, index: 4 }]));
  recorder.heard({
    owner: light,
    kind: 'light',
    notes: [],
    changes: [{ type: 'per-note controller', index: 4, controller: 'volume', value: 0, t: 5 }],
    unrecorded: true,
  });
  assert.equal(recorder.regions(10)[1].notes[0].lanes, undefined, 'its changes');
  const owned = new Recorder();
  owned.leaveOut((each) => each.owner === pad);
  owned.heard(play(light, 1, [1]));
  owned.heard(play(pad, 1, [1.5]));
  assert.deepEqual(
    spans(owned.regions(5)).map(([owner]) => owner),
    [light],
    "as the transport leaves a surface's out while the arrangement plays back",
  );
});

test("a note's glides sent with it kept as its pitch's lane, a value at each time, as its changes after it are", () => {
  const recorder = new Recorder();
  recorder.heard(play(light, 1, [{ t: 2, pitch: 60, duration: 2, index: 3, glides: [[2.5, 62]] }]));
  const [note] = recorder.regions(5)[0].notes;
  assert.deepEqual([note.glides, note.lanes], [undefined, { pitch: [{ value: 62, t: 2.5 }] }]);
});

// a clock with a stop in it: held from 5 s to 8 s, so song time stands at 5 through it and a time after it is 3 s less
const stopped = {
  toTimeline: (t) => (t <= 5 ? t : Math.max(5, t - 3)),
  fromTimeline: (along) => (along <= 5 ? along : along + 3),
};

test("what's heard kept at its song time: the plays carry clock times, a stop's hold taken out, so a stop leaves no gap in what's recorded", () => {
  const recorder = new Recorder({ song: stopped });
  recorder.heard(play(bass, 1, [4.5, 8.5], { track: 3, until: Infinity })); // a note a half second either side of the stop
  recorder.heard(play(light, 2, [9]));
  const [loop, single] = recorder.regions(7);
  assert.deepEqual(
    loop.notes.map((note) => [note.t, note.duration]),
    [
      [4.5, 0.2],
      [5.5, 0.2],
    ],
    'the note after the stop a second after the one before: its length as it was sent',
  );
  assert.deepEqual([loop.from, loop.to, single.from, single.to], [4.5, 5.7, 6, 6.2]);
  assert.equal(loop.until, Infinity, 'never stays never');
});

test("a held note's end, its glides, its changes and a track's controllers at song time too; the length of a note ended after a stop is its song time's", () => {
  const recorder = new Recorder({ song: stopped });
  const held = { t: 4, pitch: 50, index: 7, glides: [[9, 52]] };
  recorder.heard(play(pad, 1, [held], { live: true }));
  recorder.heard(play(pad, 1, [], { live: true, changes: [{ index: 7, controller: 'volume', value: 0.3, t: 10 }] }));
  recorder.heard(play(pad, 1, [], { live: true, ends: [{ index: 7, t: 11 }] }));
  recorder.heard(controls('lead', 0, [{ controller: 'air', value: 900, t: 12, glide: 0.08 }]));
  const [region] = recorder.regions(9);
  const [note] = region.notes;
  assert.deepEqual([note.t, note.duration, region.to], [4, 4, 8], 'from 4 to 8 in song time, 7 s on the clock');
  assert.deepEqual(note.lanes, { pitch: [point(6, 52)], volume: [point(7, 0.3)] });
  assert.deepEqual(
    pointsOf(recorder.lanes(9), 'lead', 0, 'air'),
    [point(9, 900, 0.08)],
    'the glide a time constant: as it was',
  );
});

test("a held note carried into its element's next region begins there in song time", () => {
  const recorder = new Recorder({ song: stopped });
  recorder.heard(play(pad, 1, [{ t: 4, pitch: 50, index: 4 }], { live: true }));
  recorder.heard(play(pad, 2, [{ t: 10, pitch: 52, index: 5 }], { live: true }));
  const [before, after] = recorder.regions(9);
  assert.deepEqual([before.from, before.to], [4, 7], 'ended where the next begins, 10 s on the clock, 7 on the song');
  assert.deepEqual(
    after.notes.map((note) => [note.index, note.t]),
    [
      [5, 7],
      [4, 7],
    ],
    'the new note, then the carried one',
  );
});

test("the last 30 minutes are song time's: an hour held is not an hour of history, what was heard before it kept while 30 minutes of music haven't passed", () => {
  const hour = {
    toTimeline: (t) => (t <= 100 ? t : Math.max(100, t - 3600)),
    fromTimeline: (along) => (along <= 100 ? along : along + 3600),
  };
  const recorder = new Recorder({ song: hour });
  recorder.heard(play(light, 1, [50]));
  recorder.heard(play(light, 2, [3750])); // song time 150
  assert.deepEqual(
    spans(recorder.regions(200)).map(([, from]) => from),
    [50, 150],
    'at song time 200, 30 minutes of music not yet gone',
  );
  recorder.heard(play(light, 3, [3750 + 1700])); // song time 1850
  assert.deepEqual(
    spans(recorder.regions(1900)).map(([, from]) => from),
    [150, 1850],
    'at 1900, the one at 50 let go: more than 30 minutes of music before',
  );
});

test("the recording's data at song time: where it begins and ends as the song time handed in", () => {
  const recorder = new Recorder({ song: stopped });
  recorder.heard(play(light, 1, [9]));
  const data = recorder.toData(7);
  assert.deepEqual([data.begins, data.ends, data.regions[0].notes[0].t], [6, 7, 6]);
});

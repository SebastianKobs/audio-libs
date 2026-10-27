// The recording as data (mockup/src/libs/sequencing/midi-sequencer/recording-data.ts): the recorder's regions and lanes out as
// plain data, JSON-safe, and loaded back into another recorder, which keeps what the first kept
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Recorder } from '../index.ts';

const light = { kind: 'light' };
const bass = { kind: 'bass' };
const play = (owner, region, notes, more = {}) => ({
  owner,
  kind: owner.kind,
  role: owner.kind,
  live: false,
  notes,
  ...(region === undefined ? {} : { region }),
  ...more,
});
// a recorder fed what a session holds: two regions of one light, a looping bass held open, a note's own lanes, a pitch glide, a track's lane
function sessionRecorded() {
  const recorder = new Recorder();
  recorder.heard(
    play(light, 1, [{ t: 1, pitch: 60, velocity: 0.8, duration: 0.2, index: 1, part: 2 }], {
      track: 0,
      trackName: 'track 1',
      until: 4,
    }),
  );
  recorder.heard(
    play(light, 2, [{ t: 3, pitch: 64, velocity: 1, duration: 0.2, index: 2, glides: [[3.1, 66]] }], {
      track: 0,
      trackName: 'track 1',
    }),
  );
  recorder.heard(
    play(bass, 1, [{ t: 2, pitch: 36, velocity: 1, index: 3, controllers: { bend: 0.5 } }], {
      track: 3,
      trackName: 'track 4',
      until: Infinity,
    }),
  );
  recorder.heard(
    play(bass, undefined, [], {
      changes: [{ type: 'per-note controller', index: 3, controller: 'volume', value: 0.3, t: 2.5, glide: 0.1 }],
    }),
  );
  recorder.heard({
    owner: null,
    kind: 'bass',
    notes: [],
    track: 3,
    trackName: 'track 4',
    controls: [
      { type: 'controller', controller: 'cutoff', value: 0.2, t: 1 },
      { type: 'controller', controller: 'cutoff', value: 0.9, t: 2, glide: 0.25 },
    ],
  });
  return recorder;
}

test('the data holds a version from 1, where the recording begins and ends, each region with its notes and each lane with its points', () => {
  const data = sessionRecorded().toData(5);
  assert.equal(data.version, 1);
  assert.equal(data.begins, 1);
  assert.equal(data.ends, 5);
  assert.equal(data.regions.length, 3);
  assert.deepEqual(data.lanes, [
    {
      kind: 'bass',
      track: 3,
      trackName: 'track 4',
      controller: 'cutoff',
      points: [
        { t: 1, value: 0.2 },
        { t: 2, value: 0.9, glide: 0.25 },
      ],
    },
  ]);
});

test("the owners and clips are ids, one per element: a light's two regions share one, the bass has another", () => {
  const { regions } = sessionRecorded().toData(5);
  assert.match(regions[0].owner, /^element-\d+$/);
  assert.equal(regions[0].owner, regions[1].owner);
  assert.notEqual(regions[0].owner, regions[2].owner);
  assert.equal(regions[0].clip, regions[0].owner, 'a clip that is its element');
});

test('handed how a clip is named, each clip is written by that name, its owner still an id; a loaded region keeps the name, and the round trip stays the same', () => {
  const nameOf = ({ clip }) => `${clip.kind} clip`;
  const data = sessionRecorded().toData(5, nameOf);
  assert.deepEqual(
    data.regions.map(({ clip }) => clip),
    ['light clip', 'light clip', 'bass clip'],
  );
  assert.match(data.regions[0].owner, /^element-\d+$/);
  const loaded = new Recorder();
  loaded.load(JSON.parse(JSON.stringify(data)));
  assert.equal(loaded.regions(5)[0].clip, 'light clip', 'a loaded region holds its clip as the name');
  assert.deepEqual(
    loaded.toData(5, ({ clip }) => String(clip)),
    data,
    'named by the name it holds',
  );
});

test('the data is plain: it comes through JSON as it was, an open-ended until included', () => {
  const data = sessionRecorded().toData(5);
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  assert.equal(data.regions[2].until, 'never');
});

test('a round trip: the data loaded into another recorder, that one gives the same data', () => {
  const data = JSON.parse(JSON.stringify(sessionRecorded().toData(5)));
  const loaded = new Recorder();
  loaded.load(data);
  assert.deepEqual(loaded.toData(5), data);
});

test('a loaded recording keeps its regions as the recorder has them: their spans, a held note open, its own lanes, a pitch glide', () => {
  const first = sessionRecorded();
  const loaded = new Recorder();
  loaded.load(first.toData(5));
  const idsOf = (regions) => regions.map(({ owner: _owner, clip: _clip, ...rest }) => rest);
  assert.deepEqual(idsOf(loaded.regions(5)), idsOf(first.regions(5)));
  const held = loaded.regions(5)[2];
  assert.equal(held.to, Infinity);
  assert.equal(held.notes[0].duration, undefined);
  assert.deepEqual(held.notes[0].lanes, { volume: [{ t: 2.5, value: 0.3, glide: 0.1 }] });
  assert.deepEqual(loaded.regions(5)[1].notes[0].lanes, { pitch: [{ t: 3.1, value: 66 }] });
  assert.equal(loaded.regions(5)[0].until, 4);
  assert.equal(loaded.regions(5)[2].until, Infinity);
  assert.deepEqual(loaded.lanes(5), first.lanes(5));
});

test('a loaded recording is told apart as it was: its regions of one element together, the owners kept apart, and an end told after still ends its held note', () => {
  const loaded = new Recorder();
  loaded.load(sessionRecorded().toData(5));
  const [one, two, held] = loaded.regions(5);
  assert.equal(one.owner, two.owner);
  assert.notEqual(one.owner, held.owner);
  loaded.heard({ owner: held.owner, kind: 'bass', notes: [], ends: [{ type: 'note off', index: 3, t: 6 }] });
  assert.equal(loaded.regions(7)[2].notes[0].duration, 4);
});

test('the data is its own: loading it copies it, and the recorder it came from is left as it was', () => {
  const recorder = sessionRecorded();
  const data = recorder.toData(5);
  const before = JSON.stringify(data);
  const loaded = new Recorder();
  loaded.load(data);
  loaded.heard(play(light, 9, [{ t: 4, pitch: 70, duration: 0.2, index: 9 }]));
  assert.equal(JSON.stringify(data), before);
  assert.equal(recorder.regions(5).length, 3);
});

test('an empty recording is data too, loaded back empty; one in a version not known is refused, naming it; and a recorder holding plays refuses a load', () => {
  const empty = new Recorder().toData(5);
  assert.deepEqual(empty, { version: 1, begins: 5, ends: 5, regions: [], lanes: [] });
  const loaded = new Recorder();
  loaded.load(empty);
  assert.deepEqual(loaded.regions(5), []);
  assert.throws(() => new Recorder().load({ ...empty, version: 2 }), /version 2/);
  assert.throws(() => sessionRecorded().load(empty), /empty/);
});
test('a long session is data too: three knobs moved together on every frame for half an hour, each move a lane point, begins where the first is', () => {
  const recorder = new Recorder();
  const moves = 30 * 60 * 60; // a frame's move, 60 a second, for 30 minutes, on each knob: together more points than a call takes as its arguments
  const knobs = ['level', 'side', 'wet'];
  const controls = knobs.flatMap((controller) =>
    Array.from({ length: moves }, (_, at) => ({ controller, value: at % 2, t: 1 + at / 60 })),
  );
  recorder.heard({ owner: light, kind: 'light', live: false, notes: [], track: 0, trackName: 'track 1', controls });
  const data = recorder.toData(1 + moves / 60);
  assert.equal(data.begins, 1);
  assert.deepEqual(
    data.lanes.map((lane) => lane.points.length),
    knobs.map(() => moves),
  );
});
test('a recorder emptied holds nothing, its regions, lanes and numbers gone, and takes a recording again', () => {
  const recorder = sessionRecorded();
  const data = recorder.toData(5);
  recorder.empty();
  assert.deepEqual(recorder.regions(5), []);
  assert.deepEqual(recorder.lanes(5), []);
  assert.deepEqual(recorder.toData(5), new Recorder().toData(5));
  recorder.load(data);
  assert.deepEqual(recorder.toData(5), data);
  recorder.heard(play(light, 1, [{ t: 6, pitch: 70, duration: 0.2, index: 9 }])); // a region number used before is free again
  assert.equal(recorder.regions(7).length, 4);
});

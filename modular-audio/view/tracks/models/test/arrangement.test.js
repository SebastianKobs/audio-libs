// libs/modular-audio/view/tracks/models/arrangement/arrangement.ts: the model itself, on a clock of the tests'
// own: looked at on every beat while it shows, its folds, its lanes opened, the playhead placed and cued,
// scrolled back
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEND_PARAM, STRIP_PARAMS } from '../../../../../base/params/index.ts';
import { arrangementOf, lane, region } from './arrangement.js';

test('looked at on every beat while it shows, not before: its rows, the regions on them, each labelled by its clip, played live or not, greyed once its clip is gone', () => {
  const regions = [region('tap', 0, { name: 'flower 1' }), region('tap', 1, { name: 'flower 2', gone: true })];
  const { arrangement, clock } = arrangementOf({ regions });
  clock.step(4);
  assert.deepEqual(arrangement.rows, [], 'not shown: not looked at');
  arrangement.show(true);
  assert.deepEqual(
    arrangement.regions.map(({ row, label, live, gone }) => [row, label, live, gone]),
    [
      ['tap 0', 'flower 1', false, false],
      ['tap 1', 'flower 2', false, true],
    ],
  );
  regions.push(region('vine', 0, { name: 'vine 1' }));
  clock.step(5);
  assert.equal(arrangement.regions.length, 2, 'not between beats');
  clock.step(8);
  assert.equal(arrangement.regions.length, 3, 'on the next beat');
});

test("a group's header unfolds it, with shift every group, as the one clicked goes; a track's lanes opened, with shift every track's; a lane laid on its param as the desk declares it, one nothing declares by the fader law, as a send", () => {
  const lanes = [lane('tap', 0, 'volume'), lane('tap', 0, 'send/reverb'), lane('vine', 0, 'pan')];
  const regions = [region('tap', 0, {}), region('tap', 1, {}), region('vine', 0, {}), region('vine', 1, {})];
  const { arrangement } = arrangementOf({ regions, lanes });
  arrangement.show(true);
  const keys = () => arrangement.rows.filter(({ header }) => !header).map(({ key }) => key);
  assert.deepEqual(keys().slice(0, 2), ['tap 0', 'vine 0'], 'folded at first');
  arrangement.toggleGroup('tap', false);
  assert.deepEqual(keys().slice(0, 3), ['tap 0', 'tap 1', 'vine 0']);
  arrangement.toggleGroup('vine', true);
  assert.deepEqual(
    keys().slice(0, 4),
    ['tap 0', 'tap 1', 'vine 0', 'vine 1'],
    'shift: every group, unfolded as vine goes',
  );
  arrangement.toggleLanes('tap 0', false);
  assert.deepEqual(
    arrangement.lanes.map(({ row, spec }) => [row, spec]),
    [
      ['tap 0: volume', STRIP_PARAMS.volume],
      ['tap 0: send/reverb', SEND_PARAM],
    ],
  );
  arrangement.toggleLanes('tap 0', true);
  assert.deepEqual(arrangement.lanes, [], "shift: every track's closed, as tap 0 goes");
});

test("a MIDI device's lane, as the source that declares it lays it: its key on the device's choices, marked a MIDI device's; a strip's own volume not", () => {
  const key = { name: 'key', choices: ['Dreamy', 'Bright'], default: 'Dreamy' };
  const lanes = [
    { ...lane('background', 1, 'key'), trackName: 'background/1' },
    { ...lane('background', 1, 'volume'), trackName: 'background/1' },
  ];
  const { arrangement } = arrangementOf({ lanes, midiDevices: [key] });
  arrangement.show(true);
  arrangement.toggleLanes('background 1', false);
  assert.deepEqual(
    arrangement.lanes.map(({ row, spec, midi }) => [row, spec, midi]),
    [
      ['background 1: key', key, true],
      ['background 1: volume', STRIP_PARAMS.volume, false],
    ],
  );
});

test("an instrument with no notes a row in its section, its lanes under it once opened, in its patch's order", () => {
  const instruments = [{ group: 'instruments', strip: 'instrument rhodes', name: 'rhodes' }];
  const lanes = [lane('instrument rhodes', null, 'voice/decay'), lane('instrument rhodes', null, 'voice/cutoff')];
  const { arrangement } = arrangementOf({ lanes, instruments });
  arrangement.show(true);
  const instrumentRows = () => arrangement.rows.slice(arrangement.rows.findIndex(({ key }) => key === 'instruments'));
  assert.deepEqual(
    instrumentRows().map(({ key, name, header }) => (header ? `[${name}]` : `${key}: ${name}`)),
    ['[instruments]', 'strip instrument rhodes: rhodes'],
  );
  arrangement.toggleLanes('strip instrument rhodes', false);
  assert.deepEqual(
    instrumentRows().map(({ key }) => key),
    [
      'instruments',
      'strip instrument rhodes',
      'strip instrument rhodes: voice/cutoff',
      'strip instrument rhodes: voice/decay',
    ],
  );
});

test('a press in the ruler puts the playhead on the nearest beat, its release cueing its time, then the playback it starts followed again from there; a release with no press, nothing', () => {
  const { arrangement, clock, cued } = arrangementOf();
  clock.step(100);
  arrangement.show(true);
  arrangement.frame(64);
  arrangement.scrollBy(16);
  arrangement.press(61);
  arrangement.placeAt(70.5);
  assert.equal(arrangement.playhead, 72);
  arrangement.release();
  assert.deepEqual(cued, [18], 'its time: 16th 72, a quarter of a second each');
  assert.equal(arrangement.following, true, 'the playback it starts followed again, at once');
  arrangement.release();
  assert.deepEqual(cued, [18], 'no press, nothing cued');
  arrangement.press(101);
  arrangement.release();
  assert.deepEqual([arrangement.playhead, cued], [null, [18, null]], 'past the present: back on it');
});

test("playing back, the playhead the transport's, followed again as playback starts", () => {
  const { arrangement, clock, transport } = arrangementOf();
  Object.assign(transport, { playhead: () => 20 });
  clock.step(400);
  arrangement.show(true);
  arrangement.frame(64);
  arrangement.scrollBy(200);
  Object.assign(transport, { playingBack: true });
  arrangement.frame(64);
  assert.deepEqual([arrangement.playhead, arrangement.following], [80, true]);
  assert.equal(arrangement.right, 96, 'brought a bar from the right edge');
});

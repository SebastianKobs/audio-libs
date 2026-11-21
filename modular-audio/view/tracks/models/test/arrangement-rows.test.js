// modular-audio/view/tracks/models/arrangement/rows.ts: the arrangement's rows, read from
// Arrangement.rows, regions and lanes:
//   - the tracks as the session view groups them, the desk's strips below them, a track's lanes under it;
//   - where a region and a lane go, and which none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrangementOf, DESK, lane, replay, yours } from './arrangement.js';

const TOGGLE = { true: ' ▾', false: ' ▸', undefined: '' }; // unfolded or opened, folded or closed, nothing to fold

test("the rows as the session view groups its tracks: your kinds' pools first, each once your playing uses one, as many tracks as it ever used; a kind's once its replays use one, the background's first", () => {
  const regions = [yours('tap', 1), yours('vine', 0), replay('vine', 0), replay('tap', 2), replay('bass', 0)];
  const { arrangement } = arrangementOf({ regions });
  arrangement.show(true);
  for (const group of ['my tap', 'my trace', 'background', 'tap', 'vine']) {
    arrangement.toggleGroup(group, false);
  }
  assert.deepEqual(namedRows(arrangement), [
    '[my tap]',
    'my tap 0: my tap 1',
    'my tap 1: my tap 2',
    '[my trace]',
    'my trace 0: my trace 1',
    '[background]',
    'background 0: background 1',
    '[flowers]',
    'tap 0: flowers 1',
    'tap 1: flowers 2',
    'tap 2: flowers 3',
    '[vines]',
    'vine 0: vines 1',
    '[bus]', // the desk's sections, folded to their first strip
    'strip you: my playing',
    '[fx]',
    'strip reverb: reverb',
    '[master]',
    'strip master: master',
  ]);
});

test('the groups start folded, each its first track alone under its header, marked ▸ where folding hides a track; unfolded, ▾', () => {
  const { arrangement } = arrangementOf({ regions: [replay('tap', 2), replay('vine', 0)] });
  arrangement.show(true);
  arrangement.toggleGroup('tap', false);
  assert.deepEqual(markedRows(arrangement), [
    '[tap ▾]',
    'tap 0',
    'tap 1',
    'tap 2',
    '[vine]',
    'vine 0',
    '[bus ▸]',
    'strip you',
    '[fx]',
    'strip reverb',
    '[master]',
    'strip master',
  ]);
});

test("a region's row: yours on its kind's pool's track by its number, a replay on its group's, the background's sounds on the background's; none for yours on no track", () => {
  const regions = [yours('vine', 3), replay('tap', 1), replay('ambient', 2), yours('tap', null)];
  const { arrangement } = arrangementOf({ regions });
  arrangement.show(true);
  assert.deepEqual(
    arrangement.regions.map(({ row }) => row),
    ['my trace 3', 'tap 1', 'background 2'],
  );
});

test("the desk's strips with no notes of their own, from the desk: each bus and those that go into it after it, the returns, the master; each by its address and its name as shown", () => {
  const { arrangement } = arrangementOf();
  arrangement.show(true);
  arrangement.toggleGroup('bus', false);
  assert.deepEqual(namedRows(arrangement), [
    '[bus]',
    'strip you: my playing',
    'strip trace: my trace',
    'strip ambient: background',
    '[fx]',
    'strip reverb: reverb',
    '[master]',
    'strip master: master',
  ]);
  const noMaster = arrangementOf({ desk: { ...DESK, master: undefined } }).arrangement;
  noMaster.show(true);
  assert.deepEqual(
    noMaster.rows.filter(({ header }) => header).map(({ key }) => key),
    ['bus', 'fx'],
    'no master: none',
  );
});

test("the desk's strips with no notes of their own: rows of their own below the replay tracks, always, as the session view's sections, bus, fx and master", () => {
  const { arrangement } = arrangementOf({ regions: [replay('tap', 0)] });
  arrangement.show(true);
  assert.deepEqual(
    arrangement.rows.filter(({ header }) => header).map(({ key }) => key),
    ['tap', 'bus', 'fx', 'master'],
  );
  assert.equal(arrangement.rows.at(-1)?.key, 'strip master');
});

test("a lane's row: a replay's, a background track's or a pool track's of yours by its group and number, a strip's on its own, your kinds' channels' among them; none for a strip with no row", () => {
  const lanes = [
    lane('tap', 1, 'air/cutoff'),
    lane('background', 2, 'pan'),
    lane('my hold', 0, 'utility/pan'),
    lane('trace', null, 'utility/level'),
    lane('ambient', null, 'send/reverb'),
    lane('nowhere', null, 'volume'),
  ];
  const { arrangement } = arrangementOf({ lanes });
  arrangement.show(true);
  arrangement.toggleGroup('tap', true);
  arrangement.toggleLanes('tap 1', true);
  assert.deepEqual(
    arrangement.lanes.map(({ row }) => row),
    [
      'tap 1: air/cutoff',
      'background 2: pan',
      'my hold 0: utility/pan',
      'strip trace: utility/level',
      'strip ambient: send/reverb',
    ],
  );
});

test("a pool's group shown once a lane of one of its tracks is recorded, as a replay kind's is", () => {
  const { arrangement } = arrangementOf({ lanes: [lane('my circle', 1, 'air/cutoff')] });
  arrangement.show(true);
  assert.deepEqual(
    arrangement.rows.filter(({ group }) => group === 'my circle').map(({ key, header }) => (header ? `[${key}]` : key)),
    ['[my circle]', 'my circle 0'],
  );
});

test("a track with lanes marked closed, until it's opened: then its lanes under it, a row each, named by its key's slot and param, a send by its return, in the order the sound goes through its strip, a dullness after its Utility", () => {
  const lanes = [
    lane('tap', 1, 'volume'),
    lane('tap', 1, 'send/reverb'),
    lane('tap', 1, 'air/cutoff'),
    lane('tap', 1, 'mute'),
    lane('tap', 1, 'utility/level'),
    lane('tap', 1, 'dull/cutoff'),
    lane('master', null, 'volume'),
    lane('master', null, 'limiter/ceiling'),
  ];
  const { arrangement } = arrangementOf({ lanes });
  arrangement.show(true);
  arrangement.toggleGroup('tap', false);
  assert.deepEqual(
    arrangement.rows.filter(({ key }) => ['tap 1', 'strip master'].includes(key)).map(({ open }) => open),
    [false, false],
    'marked closed',
  );
  assert.deepEqual(
    arrangement.rows.filter(({ track }) => track),
    [],
    'no lane shown',
  );
  arrangement.toggleLanes('tap 1', false);
  arrangement.toggleLanes('strip master', false);
  assert.deepEqual(laneNamesUnder('tap 1', arrangement), [
    'air cutoff',
    'utility level',
    'dull cutoff',
    'reverb',
    'volume',
    'mute',
  ]);
  assert.deepEqual(laneNamesUnder('strip master', arrangement), ['limiter ceiling', 'volume']);
  assert.deepEqual(
    markedRows(arrangement).filter((row) => row.endsWith('▾') || row.startsWith('  ')),
    [
      'tap 1 ▾',
      '  tap 1: air cutoff',
      '  tap 1: utility level',
      '  tap 1: dull cutoff',
      '  tap 1: reverb',
      '  tap 1: volume',
      '  tap 1: mute',
      'strip master ▾',
      '  strip master: limiter ceiling',
      '  strip master: volume',
    ],
    'each directly under its track',
  );
});

test("a lane its strip doesn't list comes after those it does, in the order recorded; a lane on its track's own strip, by the name its play was sent to", () => {
  const lanes = [
    { ...lane('tap', 1, 'echo/time'), trackName: 'tap' },
    { ...lane('tap', 1, 'volume'), trackName: 'tap' },
    { ...lane('tap', 1, 'air/cutoff'), trackName: 'tap' },
  ];
  const { arrangement } = arrangementOf({ lanes });
  arrangement.show(true);
  arrangement.toggleGroup('tap', false);
  arrangement.toggleLanes('tap 1', false);
  assert.deepEqual(laneNamesUnder('tap 1', arrangement), ['air cutoff', 'volume', 'echo time']);
});

test("a lane's name, as the arrangement shows it, by its key: its slot and param, a send by its return's name, a strip's own by its param; a param deeper in its slot by its own name (a patch's setting)", () => {
  const controllers = [
    'osc 1/osc/wave',
    'osc 1/osc/phase',
    'air/cutoff',
    'dull/cutoff',
    'delay/time',
    'utility/level',
    'limiter/gain',
    'send/far reverb',
    'volume',
  ];
  const lanes = controllers.map((controller) => lane('vine', 1, controller)); // a strip listing none: as recorded
  const { arrangement } = arrangementOf({ lanes });
  arrangement.show(true);
  arrangement.toggleGroup('vine', false);
  arrangement.toggleLanes('vine 1', false);
  assert.deepEqual(laneNamesUnder('vine 1', arrangement), [
    'osc 1 wave',
    'osc 1 phase',
    'air cutoff',
    'dull cutoff',
    'delay time',
    'utility level',
    'limiter gain',
    'far reverb',
    'volume',
  ]);
});

// a header as [its name], a track or a lane as its key and name
function namedRows(arrangement) {
  return arrangement.rows.map(({ key, name, header }) => (header ? `[${name}]` : `${key}: ${name}`));
}
// a header as [its key and mark], a track as its key and mark, a lane under its track as its track and name
function markedRows(arrangement) {
  return arrangement.rows.map(({ key, name, header, open, track }) => {
    if (header) {
      return `[${key}${TOGGLE[open]}]`;
    }
    return track ? `  ${track}: ${name}` : `${key}${TOGGLE[open]}`;
  });
}
function laneNamesUnder(track, arrangement) {
  return arrangement.rows.filter((row) => row.track === track).map(({ name }) => name);
}

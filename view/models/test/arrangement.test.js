// The arrangement as a model (mockup/src/libs/view/models/arrangement/), in node:
//   - its rows, as the session view groups its tracks, the desk's strips with no notes below them,
//     a track's lanes under it in the order the sound goes through its strip;
//   - the time in view, in 16ths, following the present or the playhead, or scrolled back;
//   - a region's notes and a lane's line, as they're drawn; where a click in the ruler puts the
//     playhead;
//   - a strip's controllers and a lane's param, as the desk's view models declare them;
//   - the model itself: looked at on every beat while it shows, its folds, its lanes opened, the
//     playhead placed and cued, scrolled back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Arrangement, declaredBy, ViewBuilder } from '../index.ts';
import { arrangedStrips, laneRowOf, rowKeyOf, rowsOf } from '../arrangement/rows.ts';
import { TimeWindow } from '../arrangement/time-window.ts';
import { keptWhole, noteShape, pitchRange } from '../arrangement/note-shapes.ts';
import { laneLine } from '../arrangement/lane-shapes.ts';
import { playheadAt } from '../arrangement/playhead.ts';
import { faderPosition, PAN, SEND_PARAM, STRIP_PARAMS, positionOf } from '../../../params/index.ts';
import { BLOCKS, DELAY_TIME, LIMITER_SPECS } from '../../../plan/blocks/index.ts';
import { near } from '../../../util/test/near.js';
import { STUDIO } from './desk.js';

// the tracks, as a control surface names them: your kinds' pools first, then each kind's group,
// the background's sounds sharing one
const ROLE = { tap: 'tap', vine: 'trace', bloom: 'hold', tower: 'circle' };
const myGroupOf = (kind) => (ROLE[kind] ? `my ${ROLE[kind]}` : null);
const groupOf = (kind) => (['ambient', 'bass'].includes(kind) ? 'background' : kind);
const tracks = {
  groups: [
    ...Object.values(ROLE).map((role) => ({ group: `my ${role}`, name: `my ${role}` })),
    { group: 'background', name: 'background' },
    { group: 'tap', name: 'flowers' },
    { group: 'vine', name: 'vines' },
  ],
  groupOf: (kind, live) => (live ? myGroupOf(kind) : groupOf(kind)),
  clipName: (clip) => clip.name,
  hasClip: (clip) => !clip.gone,
};

const replay = (kind, track) => ({ clip: {}, kind, role: kind, live: false, track, from: 1, to: 2 });
const yours = (kind, track) => ({ clip: {}, kind, role: ROLE[kind], live: true, track, from: 1, to: 2 });

test("the rows as the session view groups its tracks: your kinds' pools first, each once your playing uses one, as many tracks as it ever used (N3); a kind's once its replays use one, the background's first", () => {
  const unfolded = new Set(['my tap', 'my trace', 'background', 'tap', 'vine']);
  const rows = rowsOf(
    [yours('tap', 1), yours('vine', 0), replay('vine', 0), replay('tap', 2), replay('bass', 0)],
    tracks,
    unfolded,
  );
  assert.deepEqual(
    rows.map(({ key, name, header }) => (header ? `[${name}]` : `${key}: ${name}`)),
    [
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
    ],
  );
});

test('the groups start folded, each its first track alone under its header, marked ▸ where folding hides a track; unfolded, ▾', () => {
  const toggle = { true: ' ▾', false: ' ▸', undefined: '' }; // a group unfolded, folded, or with nothing to fold
  const rows = rowsOf([replay('tap', 2), replay('vine', 0)], tracks, new Set(['tap']));
  assert.deepEqual(
    rows.map(({ key, header, open }) => (header ? `[${key}${toggle[open]}]` : key)),
    ['[tap ▾]', 'tap 0', 'tap 1', 'tap 2', '[vine]', 'vine 0'],
  );
});

test("a region's row: yours on its kind's pool's track by its number (N3), a replay on its group's, the background's sounds on the background's; none for yours on no track, a recording's from before N2", () => {
  assert.deepEqual(
    [yours('vine', 3), replay('tap', 1), replay('ambient', 2), yours('tap', null)].map((region) =>
      rowKeyOf(region, tracks),
    ),
    ['my trace 3', 'tap 1', 'background 2', null],
  );
});

// the lanes' rows (G5a): the desk's strips with no notes of their own, rows below the replay tracks, as the session view's sections; a
// track with lanes marked, closed until opened, and opened its lanes under it, a row each, named by its controller, in the order the
// sound goes through its strip
const strips = [
  { group: 'bus', strip: 'you', name: 'my playing' },
  { group: 'bus', strip: 'trace', name: 'my trace' },
  { group: 'bus', strip: 'ambient', name: 'background' },
  { group: 'fx', strip: 'reverb', name: 'reverb' },
  { group: 'master', strip: 'master', name: 'master' },
];
// the mixer's sections as a view labels them
const SECTIONS = { buses: 'bus', returns: 'fx', master: 'master' };

// the mixer they're from: each bus and those that go into it, the returns, the master
const strip = (name, shown) => ({ address: [name], name: shown });
const MIXER = {
  buses: [
    { bus: strip('you', 'my playing'), members: [strip('trace', 'my trace')] },
    { bus: strip('ambient', 'background'), members: [] },
  ],
  returns: [strip('reverb', 'reverb')],
  master: strip('master', 'master'),
};

test("the desk's strips with no notes of their own, from the mixer: each bus and those that go into it after it, the returns, the master; each by its address and its name as shown", () => {
  assert.deepEqual(arrangedStrips(MIXER, SECTIONS), strips);
  assert.deepEqual(arrangedStrips({ ...MIXER, master: undefined }, SECTIONS).at(-1), strips.at(-2), 'no master: none');
});

const lane = (kind, track, controller) => ({ kind, track, controller, points: [{ t: 1, value: 0.5 }] });

test("the desk's strips with no notes of their own: rows of their own below the replay tracks, always, as the session view's sections, bus, fx and master", () => {
  const rows = rowsOf([], tracks, new Set(['bus', 'fx', 'master']), { strips });
  assert.deepEqual(
    rows.map(({ key, name, header }) => (header ? `[${name}]` : `${key}: ${name}`)),
    [
      '[bus]',
      'strip you: my playing',
      'strip trace: my trace',
      'strip ambient: background',
      '[fx]',
      'strip reverb: reverb',
      '[master]',
      'strip master: master',
    ],
  );
});

test("a lane's row: a replay's, a background track's or a pool track's of yours by its group and number (N3), a strip's on its own, your kinds' channels' among them; none for a strip with no row", () => {
  assert.deepEqual(
    [
      lane('tap', 1, 'air/cutoff'),
      lane('background', 2, 'pan'),
      lane('my hold', 0, 'utility/pan'),
      lane('trace', null, 'utility/level'),
      lane('ambient', null, 'send/reverb'),
      lane('nowhere', null, 'volume'),
    ].map((recorded) => laneRowOf(recorded, tracks, strips)),
    ['tap 1', 'background 2', 'my hold 0', 'strip trace', 'strip ambient', null],
  );
});

test("a pool's group shown once a lane of one of its tracks is recorded, as a replay kind's is (N3)", () => {
  const rows = rowsOf([], tracks, new Set(), { lanes: [lane('my circle', 1, 'air/cutoff')] });
  assert.deepEqual(
    rows.map(({ key, header }) => (header ? `[${key}]` : key)),
    ['[my circle]', 'my circle 0'],
  );
});

// a strip's controllers in the order the sound goes through it, as the desk's view models list them: one with
// a dullness after its Utility, as a tower's
const ORDERS = {
  tap: ['air/cutoff', 'utility/level', 'utility/pan', 'dull/cutoff', 'send/reverb', 'volume', 'pan', 'mute', 'solo'],
  master: ['limiter/gain', 'limiter/ceiling', 'limiter/release', 'volume'],
};
const controllersOf = (strip) => ORDERS[strip] ?? [];

test("a track with lanes marked closed, until it's opened: then its lanes under it, a row each, named by its key's slot and param, a send by its return (U2c4b2), in the order the sound goes through its strip, as the desk's view models list it, a dullness after its Utility; a lane's track a row even with no region", () => {
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
  const toggle = { true: ' ▾', false: ' ▸', undefined: '' }; // a track's lanes open, closed, or none
  const shown = (opened) =>
    rowsOf([], tracks, new Set(['tap', 'bus', 'fx', 'master']), { strips, lanes, opened, controllersOf }).map(
      ({ key, name, header, open, track }) => {
        if (header) {
          return `[${name}]`;
        }
        return track ? `  ${track}: ${name}` : `${key}${toggle[open]}`;
      },
    );
  assert.deepEqual(shown(new Set()), [
    '[flowers]',
    'tap 0',
    'tap 1 ▸',
    '[bus]',
    'strip you',
    'strip trace',
    'strip ambient',
    '[fx]',
    'strip reverb',
    '[master]',
    'strip master ▸',
  ]);
  assert.deepEqual(shown(new Set(['tap 1', 'strip master'])).slice(2, 9), [
    'tap 1 ▾',
    '  tap 1: air cutoff',
    '  tap 1: utility level',
    '  tap 1: dull cutoff',
    '  tap 1: reverb',
    '  tap 1: volume',
    '  tap 1: mute',
  ]);
  assert.deepEqual(shown(new Set(['tap 1', 'strip master'])).slice(-3), [
    'strip master ▾',
    '  strip master: limiter ceiling',
    '  strip master: volume',
  ]);
});

test("a lane its strip doesn't list comes after those it does, in the order recorded; a lane on its track's own strip, by the name its play was sent to", () => {
  const lanes = [
    { ...lane('tap', 1, 'echo/time'), trackName: 'tap' },
    { ...lane('tap', 1, 'volume'), trackName: 'tap' },
    { ...lane('tap', 1, 'air/cutoff'), trackName: 'tap' },
  ];
  const rows = rowsOf([], tracks, new Set(['tap']), { lanes, opened: new Set(['tap 1']), controllersOf });
  assert.deepEqual(
    rows.filter(({ track }) => track).map(({ name }) => name),
    ['air cutoff', 'volume', 'echo time'],
  );
});

test('the time in view follows the present, a bar from the right edge', () => {
  const view = new TimeWindow();
  view.setSpan(64); // four bars wide
  view.follow(100);
  assert.deepEqual([view.left, view.right, view.following], [52, 116, true]);
});

test('scrolled back it stops following, holding where it was as time goes on, until it is scrolled back to the present; never before the earliest', () => {
  const view = new TimeWindow();
  view.setSpan(64);
  view.follow(100);
  view.scrollBy(16, 100, 0); // a bar back
  assert.deepEqual([view.right, view.following], [100, false]);
  view.follow(104);
  assert.equal(view.right, 100, 'held as time goes on');
  view.scrollBy(-40, 104, 0);
  assert.deepEqual([view.right, view.following], [120, true], 'back at the present: following again, no further');
  view.scrollBy(1000, 104, 30);
  assert.equal(view.left, 30, 'the left edge no earlier than the earliest');
});

test('a young recording shows from its start at the left edge, the present moving right, until it is a bar from the right edge', () => {
  const view = new TimeWindow();
  view.setSpan(64);
  view.follow(10, 0);
  assert.deepEqual([view.left, view.following], [0, true], 'bar 1 at the left edge');
  view.follow(60, 0);
  assert.equal(view.left, 12, 'then following, the present a bar from the right edge');
});

// the playhead played back follows as the present does (P3b): it jumped a bar from the right edge as playback started, and, scrolled back
// first, wasn't followed at all, running off the view
test('a head that starts in view, the playhead played back from where it was set: the view stays, the head running across it, then followed a bar from the right edge, as the present is; the view never going back by itself', () => {
  const view = new TimeWindow();
  view.setSpan(64);
  view.follow(100);
  view.followAgain(70); // set back to a place in view, played back from there
  view.follow(70);
  assert.deepEqual([view.right, view.following], [116, true], 'no jump where it starts');
  view.follow(90);
  assert.equal(view.right, 116, 'running across the view');
  view.follow(105);
  assert.equal(view.right, 121, 'then followed, a bar from the right edge');
});

test('scrolled back, a head that starts is followed again; one out of view brought a bar from the right edge', () => {
  const view = new TimeWindow();
  view.setSpan(64);
  view.follow(100);
  view.scrollBy(40, 100, 0);
  assert.deepEqual([view.right, view.following], [76, false], 'scrolled back');
  view.followAgain(40);
  view.follow(40);
  assert.deepEqual([view.right, view.following], [76, true], 'followed again, where it is');
  view.follow(70);
  assert.equal(view.right, 86, 'and scrolled with');
  view.followAgain(5);
  assert.equal(view.right, 21, 'out of view: brought a bar from the right edge');
});

// a region's notes inside it (G4b): each held at its pitch, pieces at each glide, a line for each move, a slide in from its bend; a held
// one open to now; the region's pitch range, its notes' lowest to highest, what they slide in from and glide to among them

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
// back: drawn whole, its end where song time gets to its length past the hold, not cut where it began (P3c1)
test('a note sent with its length kept whole past a hold it rang through: its end where song time gets to its length; a held one, one with no end yet, one clear of the hold as they are', () => {
  // held from 5 s to 8 s
  const song = {
    toTimeline: (t) => (t <= 5 ? t : Math.max(5, t - 3)),
    fromTimeline: (s) => (s <= 5 ? s : s + 3),
  };
  assert.deepEqual(
    keptWhole({ t: 4, pitch: 60, duration: 2 }, song),
    { t: 4, pitch: 60, duration: 5 },
    'to 9 s, 2 s of song',
  );
  const held = { t: 4.5, pitch: 62, duration: 4.5, held: true };
  assert.equal(keptWhole(held, song), held, 'held: where it was let go');
  const open = { t: 4.5, pitch: 62 };
  assert.equal(keptWhole(open, song), open, 'held still');
  assert.deepEqual(
    keptWhole({ t: 1, pitch: 60, duration: 1 }, song),
    { t: 1, pitch: 60, duration: 1 },
    'clear of the hold',
  );
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

// inside the lanes (G5b): a lane's line as Web Audio plays its points, a jump a step, a glide setTargetAtTime's curve; a control's place on
// its whole range, as its control shows it
test("a lane's line: a jump straight up or down at its time, held until the next; held at the last to the end; nothing before the first point; from the last point before the view", () => {
  const points = [
    { t: 1, value: 0 },
    { t: 2, value: 1 },
    { t: 3, value: 0.5 },
  ];
  const corners = (from, to) => laneLine(points, { from, to, step: 0.1 }).map(({ t, value }) => [t, value]);
  assert.deepEqual(corners(0, 4), [
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [3, 0.5],
    [4, 0.5],
  ]);
  assert.deepEqual(corners(2.5, 4), [
    [2, 0],
    [2, 1],
    [3, 1],
    [3, 0.5],
    [4, 0.5],
  ]);
  assert.deepEqual(corners(0, 2.5), [
    [1, 0],
    [2, 0],
    [2, 1],
    [2.5, 1],
  ]);
  assert.deepEqual(corners(0, 0.5), [], 'before the first point: nothing');
});

test("a glide: setTargetAtTime's curve toward its value from where the line was, the same fraction of the way left each moment, sampled a step apart until it has settled, then held", () => {
  const points = [
    { t: 0, value: 0 },
    { t: 1, value: 1, glide: 0.5 },
  ];
  const line = laneLine(points, { from: 0, to: 10, step: 0.25 });
  const at = (t) => line.find((corner) => Math.abs(corner.t - t) < 1e-9).value;
  near(at(1), 0);
  near(at(1.5), 1 - Math.exp(-1), '', 1e-12); // a time constant on: 63 % of the way
  near(at(2), 1 - Math.exp(-2), '', 1e-12);
  const settling = line.filter(({ t }) => t > 1 && t < 3.5);
  assert.equal(settling.length, 9, 'a step apart, until five time constants on');
  assert.deepEqual(
    line.slice(-2).map(({ t }) => t),
    [3.5, 10],
    'settled: held to the end',
  );
  near(line.at(-1).value, 1, '', 1e-3);
});

test('a glide after a glide starts where the line had got to, worked out from before the view; a value long gone no longer counts', () => {
  const points = [
    { t: 0, value: 0 },
    { t: 1, value: 1, glide: 1 },
    { t: 2, value: 0, glide: 1 },
    { t: 3, value: 1, glide: 1 },
  ];
  const atTwo = 1 - Math.exp(-1);
  const atThree = atTwo * Math.exp(-1);
  const line = laneLine(points, { from: 3.5, to: 3.5, step: 0.5 });
  assert.equal(line[0].t, 3, 'from the last point before the view');
  near(line[0].value, atThree, '', 1e-12);
  near(line.at(-1).value, 1 + (atThree - 1) * Math.exp(-0.5), '', 1e-12);
  const quick = Array.from({ length: 50 }, (_point, index) => ({ t: index, value: index % 2, glide: 0.05 }));
  const far = laneLine(quick, { from: 48.5, to: 49, step: 0.5 });
  assert.equal(far[0].t, 48);
  near(far[0].value, 1, '', 1e-4); // the glide before it settled long since
});

test('points at one time: the line passes through each in turn, from the level before them, wherever the view starts', () => {
  const points = [
    { t: 0, value: 0.2 },
    { t: 1, value: 0.5 },
    { t: 1, value: 0.8 },
    { t: 2, value: 0.3 },
  ];
  const corners = (from) => laneLine(points, { from, to: 3, step: 0.1 }).map(({ t, value }) => [t, value]);
  const atOne = [
    [1, 0.2],
    [1, 0.5],
    [1, 0.8],
    [2, 0.8],
    [2, 0.3],
    [3, 0.3],
  ];
  assert.deepEqual(corners(0), [[0, 0.2], ...atOne]);
  assert.deepEqual(corners(1.5), atOne, 'the view starting after them');
});

test("a control's place on its whole range, by its param's declared taper (U2c4c): a volume, a Utility's level and a send by the fader law, unity two thirds up; a pan centred; a cutoff and a delay's time by octaves; a mute on or off; the limiter's on their own ranges", () => {
  const cutoff = BLOCKS.filter.params.find(({ name }) => name === 'frequency'); // a Filter's cutoff, its block's
  const level = BLOCKS.gain.params.find(({ name }) => name === 'gain'); // a Utility's level, its gain block's
  const pan = PAN; // a Utility's pan, its pan block's
  const { gain, ceiling } = LIMITER_SPECS;
  near(positionOf(STRIP_PARAMS.volume, 1), 2 / 3, '', 1e-12);
  near(positionOf(STRIP_PARAMS.volume, 1.57), faderPosition(1.57));
  near(positionOf(level, 0.5), faderPosition(0.5));
  near(positionOf(SEND_PARAM, 0), 0);
  near(positionOf(STRIP_PARAMS.volume, 5), 1);
  near(positionOf(STRIP_PARAMS.pan, 0), 0.5);
  near(positionOf(pan, -1), 0);
  near(positionOf(cutoff, 20), 0);
  near(positionOf(cutoff, Math.sqrt(20 * 24000)), 0.5, '', 1e-12);
  near(positionOf(cutoff, 24000), 1);
  near(positionOf(STRIP_PARAMS.mute, 1), 1);
  near(positionOf(STRIP_PARAMS.solo, 0), 0);
  near(positionOf(gain, 6), 0.5);
  near(positionOf(ceiling, -6), 0.5);
  near(positionOf(DELAY_TIME.ms, 1), 0); // a delay's free time, its shortest
  near(positionOf(DELAY_TIME.ms, Math.sqrt(4000)), 0.5, '', 1e-12);
  near(positionOf(DELAY_TIME.ms, 4000), 1); // its longest
  near(positionOf(cutoff, 0), 0); // below its range, at its bottom
  near(positionOf(DELAY_TIME.ms, -1), 0);
});

test("a lane's name, as the arrangement shows it, by its key: its slot and param, a send by its return's name, a strip's own by its param (U2c4b2)", () => {
  const controllers = [
    'air/cutoff',
    'dull/cutoff',
    'delay/time',
    'utility/level',
    'limiter/gain',
    'send/far reverb',
    'volume',
  ];
  const lanes = controllers.map((controller) => lane('tap', 1, controller));
  const rows = rowsOf([], tracks, new Set(['tap']), { lanes, opened: new Set(['tap 1']) });
  assert.deepEqual(
    rows.filter(({ track }) => track).map(({ name }) => name),
    ['air cutoff', 'dull cutoff', 'delay time', 'utility level', 'limiter gain', 'far reverb', 'volume'],
  );
});

test("where a click in the ruler puts the playhead: on the nearest beat; at or past the present, or a beat's rounding onto it, none, back on the present; never before the earliest, its first beat after (P2)", () => {
  const where = (place, earliest = 0) => playheadAt(place, { present: 40, perBeat: 4, earliest });
  assert.deepEqual(
    [where(10.9), where(13.9), where(38.1), where(41), where(-3), where(10, 16.5)],
    [12, 12, null, null, 0, 20],
  );
});

// the desk's view models on a plan's readout of the tests' own, every value at its plan's
function viewsOf() {
  return new ViewBuilder(
    {
      plan: STUDIO,
      valueOf: () => undefined,
      startOf: () => undefined,
      roleOf: () => ({ by: 'live' }),
      peakOf: () => 0,
      readingOf: () => 0,
      copiesOf: () => [],
      slotOf: () => undefined,
    },
    () => {},
  );
}

test("a strip's controllers in the order the sound goes through it, as its view model has them: its inserts' controls, its sends, its volume, pan, mute and solo; a pool's copy's too; none for a strip not on the desk", () => {
  const declared = declaredBy(viewsOf());
  assert.deepEqual(declared.controllersOf('tap'), [
    'utility/level',
    'utility/pan',
    'utility/pan/law',
    'send/reverb',
    'volume',
    'pan',
    'mute',
    'solo',
  ]);
  assert.deepEqual(declared.controllersOf('my tap/2'), ['send/reverb', 'volume', 'pan', 'mute', 'solo']);
  assert.deepEqual(declared.controllersOf('master'), ['volume']);
  assert.deepEqual(declared.controllersOf('nowhere'), []);
});

test("a lane's param as the desk declares it, by its strip and its controller there; none where nothing does", () => {
  const declared = declaredBy(viewsOf());
  assert.equal(declared.specOf('tap', 'utility/level')?.name, 'level');
  assert.equal(declared.specOf('my tap/2', 'send/reverb')?.name, 'reverb');
  assert.equal(declared.specOf('tap', 'nowhere'), undefined);
});

// The model itself, on a clock of the tests' own: 16ths a quarter of a second apart, from 0.
function arrangementOf({ regions = [], lanes = [], playhead = null, playingBack = false } = {}) {
  const steps = [];
  const clock = {
    t: 0,
    now: () => clock.t,
    onStep: (listener) => steps.push(listener),
    grid: {
      straightAt: (t) => t * 4,
      straightTime: (place) => place / 4,
      stepsPerBar: () => 16,
      stepsPerBeat: () => 4,
      heldAt: null,
      songTime: (t) => t,
      timeOfSong: (song) => song,
      song: { toTimeline: (t) => t, fromTimeline: (t) => t },
    },
    step(i) {
      clock.t = i / 4;
      for (const listener of steps) {
        listener(i, clock.t);
      }
    },
  };
  const transport = { playingBack, playhead: () => playhead };
  const declared = {
    specOf: (strip, controller) => (controller === 'volume' ? STRIP_PARAMS.volume : undefined),
    controllersOf,
  };
  const recording = { regions: () => regions, lanes: () => lanes };
  const cued = [];
  const cue = (t) => {
    cued.push(t);
    Object.assign(transport, { playingBack: t !== null }); // as the transport plays back from there, at once
  };
  const arrangement = new Arrangement({
    recording,
    transport,
    declared,
    tracks,
    mixer: MIXER,
    sections: SECTIONS,
    clock,
    cue,
  });
  return { arrangement, clock, transport, cued };
}
const region = (kind, track, clip, from = 1, to = 2) => ({ clip, kind, live: false, track, from, to, notes: [] });

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

test('a frame: the time in view following the present; scrolled back, held; a press in the ruler puts the playhead on the nearest beat, its release cueing its time, then the playback it starts followed again from there; a release with no press, nothing', () => {
  const { arrangement, clock, cued } = arrangementOf();
  clock.step(100);
  arrangement.show(true);
  arrangement.frame(64);
  assert.deepEqual([arrangement.left, arrangement.right, arrangement.following], [52, 116, true]);
  arrangement.scrollBy(16);
  assert.deepEqual([arrangement.right, arrangement.following], [100, false]);
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
  const { arrangement, clock, transport } = arrangementOf({ playhead: 20 });
  clock.step(400);
  arrangement.show(true);
  arrangement.frame(64);
  arrangement.scrollBy(200);
  Object.assign(transport, { playingBack: true });
  arrangement.frame(64);
  assert.deepEqual([arrangement.playhead, arrangement.following], [80, true]);
  assert.equal(arrangement.right, 96, 'brought a bar from the right edge');
});

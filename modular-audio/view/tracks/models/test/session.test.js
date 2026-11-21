// modular-audio/view/tracks/models/session.ts: what a session view shows of the stream, each kind's replay tracks and what plays on them, looked at now and then
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../index.ts';

// a session as the view makes it: each kind's replays on its own group, your playing on none
// unless a test says
function sessionOf(groups = {}) {
  const { groupOf, myGroupOf } = { groupOf: (kind) => kind, myGroupOf: () => null, ...groups };
  return new Session({ groupOf: (kind, live) => (live ? myGroupOf(kind) : groupOf(kind)) });
}
function flower(number) {
  return { kind: 'tap', n: number };
}
// a replay: its notes short, each with its length
function replay(owner, track, times, until, more = {}) {
  return {
    owner,
    kind: owner.kind,
    role: 'tap',
    live: false,
    track,
    until,
    notes: times.map((t) => ({ t, pitch: 60, duration: 0.1 })),
    ...more,
  };
}

test('a replay lights its clip and its track while its notes sound, and its track shows it until its tail is done', () => {
  const session = sessionOf();
  const first = flower(1);
  session.heard(replay(first, 0, [1, 1.5, 2], 4));
  assert.deepEqual(
    session.at(0.9, 0.5).tap,
    { tracks: [{ owner: null, clip: first, lit: false, waiting: first }], lit: new Set() },
    'placed, waiting for its first note',
  );
  assert.deepEqual(
    session.at(1.6, 0.9).tap,
    { tracks: [{ owner: first, clip: first, lit: true, waiting: null }], lit: new Set([first]) },
    'sounding',
  );
  assert.deepEqual(
    session.at(3, 2.5).tap,
    { tracks: [{ owner: first, clip: first, lit: false, waiting: null }], lit: new Set() },
    'its tail: its track still holds it, unlit',
  );
  assert.deepEqual(
    session.at(4.5, 3),
    { tap: { tracks: [{ owner: null, clip: null, lit: false, waiting: null }], lit: new Set() } },
    'done; the track stays',
  );
});

test('a replay shorter than the time between two looks still lights once', () => {
  const session = sessionOf();
  const first = flower(1);
  session.heard(replay(first, 0, [1.1, 1.2], 1.5));
  assert.equal(session.at(2, 1).tap.tracks[0].lit, true, 'it sounded since the last look');
  assert.equal(session.at(3, 2).tap.tracks[0].lit, false);
});

test('a held note lights for as long as it lasts', () => {
  const session = sessionOf();
  const bloom = { kind: 'bloom' };
  session.heard({
    owner: bloom,
    kind: 'bloom',
    role: 'hold',
    live: false,
    track: 0,
    until: 9,
    notes: [{ t: 1, pitch: 48, duration: 6 }],
  });
  assert.equal(session.at(6, 5).bloom.tracks[0].lit, true);
  assert.equal(session.at(8, 7.5).bloom.tracks[0].lit, false, 'its release');
});

test("a play on no track or no group isn't the session's: your playing where the view gives it no group, a replay with no track, your playing on no pool track", () => {
  const cases = [
    [sessionOf(), { ...replay(flower(1), 0, [1], 2), live: true }],
    [sessionOf(), { owner: { kind: 'bass' }, kind: 'bass', role: 'bass', live: false, notes: [{ t: 1, pitch: 36 }] }],
    [
      sessionOf({ myGroupOf: () => 'my tap' }),
      { owner: flower(1), kind: 'tap', role: 'tap', live: true, track: null, notes: [{ t: 1, pitch: 60 }] },
    ],
  ];
  for (const [session, play] of cases) {
    session.heard(play);
    assert.deepEqual(session.at(1.5, 0.5), {});
  }
});

test('overlapping replays on their tracks; a kind keeps as many tracks as it ever used; visitors and residents share theirs', () => {
  const session = sessionOf({ groupOf: (kind) => (kind === 'resident' ? 'visitor' : kind) });
  const [first, second] = [1, 2].map(flower);
  session.heard(replay(first, 0, [1], 3));
  session.heard(replay(second, 1, [1.2], 3));
  const now = session.at(1.5, 0.5).tap;
  assert.deepEqual(
    now.tracks.map((track) => track.owner),
    [first, second],
  );
  assert.deepEqual(now.lit, new Set([first, second]));
  assert.equal(session.at(10, 9).tap.tracks.length, 2, 'both tracks, long after');
  const visitor = { kind: 'visitor' };
  const resident = { kind: 'resident' };
  session.heard({
    owner: visitor,
    kind: 'visitor',
    role: 'visitor',
    live: false,
    track: 0,
    until: 13,
    notes: [{ t: 11, pitch: 60 }],
  });
  session.heard({
    owner: resident,
    kind: 'resident',
    role: 'resident',
    live: false,
    track: 1,
    until: 13,
    notes: [{ t: 11, pitch: 48 }],
  });
  assert.deepEqual(
    session.at(11.5, 10.5).visitor.tracks.map((track) => track.owner),
    [visitor, resident],
  );
});

test('a loop holds its track for as long as it plays: lit on its notes, still shown between them, and its notes let go once heard', () => {
  const session = sessionOf({
    groupOf: (kind) => (['ambient', 'brushes', 'bass'].includes(kind) ? 'background' : kind),
  });
  const bass = { kind: 'bass' };
  for (let index = 0; index < 400; index++) {
    session.heard({
      owner: bass,
      kind: 'bass',
      role: 'bass',
      live: false,
      track: 2,
      until: Infinity,
      notes: [{ t: 4 * index, pitch: 36, duration: 1 }],
    });
  }
  assert.deepEqual(
    session.at(0.5, 0).background.tracks[2],
    { owner: bass, clip: bass, lit: true, waiting: null },
    'on a note',
  );
  assert.deepEqual(
    session.at(2.5, 2).background.tracks[2],
    { owner: bass, clip: bass, lit: false, waiting: null },
    'between its notes, still its track',
  );
  assert.equal(session.at(2.5, 2).background.tracks.length, 3, "its track's place kept");
  session.at(1000.5, 1000); // note 250 sounding
  assert.equal(session.kept(), 150, 'the notes heard are let go, but the one sounding and the 149 still to come');
});

test('a replay placed but not yet sounding shows on its track as waiting, as a launched clip waits in Ableton', () => {
  const session = sessionOf();
  const first = flower(1);
  const second = flower(2);
  session.heard(replay(first, 0, [1], 2));
  session.heard(replay(second, 0, [3], 4));
  assert.deepEqual(
    session.at(1.5, 0.5).tap.tracks[0],
    { owner: first, clip: first, lit: true, waiting: null },
    'a sounds; b waits behind it, unseen',
  );
  assert.deepEqual(
    session.at(2.5, 2).tap.tracks[0],
    { owner: null, clip: second, lit: false, waiting: second },
    'a done: b waits',
  );
});

test("your playing goes on its kind's pool, its group, when the view gives one, on the track it was played on, held until it has rung out, as a replay holds its track", () => {
  const session = sessionOf({ myGroupOf: (kind) => (kind === 'tap' ? 'my tap' : null) });
  const [first, second] = [flower(1), flower(2)];
  const yours = (owner, track, t) => ({
    owner,
    kind: 'tap',
    role: 'tap',
    live: true,
    track,
    until: t + 1.5,
    notes: [{ t, pitch: 60, duration: 0.25 }],
  });
  session.heard(yours(first, 0, 1));
  session.heard(yours(second, 1, 1.25)); // overlapping a's tail: a track of its own
  session.heard({
    owner: { kind: 'bloom' },
    kind: 'bloom',
    role: 'hold',
    live: true,
    track: 0,
    notes: [{ t: 1, pitch: 48 }],
  }); // no group of yours for blooms
  assert.deepEqual(session.at(1.5, 0.5)['my tap'].tracks, [
    { owner: first, clip: first, lit: true, waiting: null },
    { owner: second, clip: second, lit: true, waiting: null },
  ]);
  assert.deepEqual(Object.keys(session.at(1.5, 0.5)), ['my tap'], 'none for a kind with no group of yours');
  assert.equal(session.at(1.5, 0.5)['my tap'].lit.has(first), true);
  assert.equal(session.at(2.25, 2).tap, undefined);
  assert.deepEqual(
    session.at(2.25, 2)['my tap'].tracks[0],
    { owner: first, clip: first, lit: false, waiting: null },
    'its note done, its tail ringing: a holds its track',
  );
  assert.equal(session.at(2.75, 2.5)['my tap'].tracks[0].owner, null, 'rung out: its track free');
});

test("a play can name the clip it plays, as a visitor's song names its motif: that clip lights, and its track says it", () => {
  const session = sessionOf();
  const visitor = { kind: 'visitor' };
  session.heard({
    owner: visitor,
    kind: 'visitor',
    role: 'visitor',
    live: false,
    track: 0,
    until: 3,
    clip: 'ask',
    notes: [{ t: 1, pitch: 60 }],
  });
  const at = session.at(1.5, 0.5).visitor;
  assert.deepEqual(at.lit, new Set(['ask']), 'its clip lights, not its singer');
  assert.equal(at.tracks[0].owner, visitor);
  assert.equal(at.tracks[0].clip, 'ask');
});

test("a note with no length, held until its note off, lights for as long as its play holds its track, as the background's held sound", () => {
  const session = sessionOf({
    groupOf: (kind) => (['ambient', 'brushes', 'bass'].includes(kind) ? 'background' : kind),
  });
  const drone = { kind: 'ambient' };
  session.heard({
    owner: drone,
    kind: 'ambient',
    role: 'held 1',
    live: false,
    track: 0,
    until: Infinity,
    notes: [
      { t: 1, pitch: 36 },
      { t: 1, pitch: 43 },
    ],
  });
  assert.deepEqual(
    session.at(600.5, 600).background.tracks[0],
    { owner: drone, clip: drone, lit: true, waiting: null },
    'ten minutes on',
  );
});

test("a held note lights from its note on until its note off comes as a play of its own: your phrase note on its pool track, held until it's let go, a held part's on its", () => {
  const session = sessionOf({
    groupOf: (kind) => (kind === 'ambient' ? 'background' : kind),
    myGroupOf: (kind) => (kind === 'vine' ? 'my trace' : null),
  });
  const vine = { kind: 'vine' };
  session.heard({
    owner: vine,
    kind: 'vine',
    role: 'trace',
    live: true,
    track: 2,
    until: Infinity,
    notes: [{ t: 1, pitch: 60, index: 4 }],
  });
  assert.equal(session.at(3, 2.5)['my trace'].tracks[2].lit, true, 'held: lit two seconds on');
  session.heard({
    owner: vine,
    kind: 'vine',
    role: 'trace',
    live: true,
    track: 2,
    notes: [],
    ends: [{ index: 4, t: 3.5 }],
  });
  assert.equal(session.at(4, 3)['my trace'].tracks[2].lit, true, 'let go since the last look');
  assert.equal(session.at(5, 4.5)['my trace'].tracks[2].lit, false, 'let go');
  assert.equal(session.at(5, 4.5)['my trace'].tracks[2].owner, null, 'its track free');
  const drone = { kind: 'ambient' };
  const part = { owner: drone, kind: 'ambient', role: 'held 1', live: false, track: 0, until: Infinity };
  session.heard({ ...part, notes: [{ t: 1, pitch: 38, index: 1 }] });
  session.heard({ ...part, notes: [], ends: [{ index: 1, t: 10 }] });
  assert.equal(session.at(9.5, 9)['background'].tracks[0].lit, true, 'held until its key changes');
  assert.equal(session.at(11, 10.5)['background'].tracks[0].lit, false, 'let go there');
});

test("a track's own controllers, and a note's changes after it, a play of their own with no notes: nothing the session shows, no group made", () => {
  const session = sessionOf({ myGroupOf: (kind) => (kind === 'tap' ? 'my tap' : null) });
  session.heard({
    owner: null,
    kind: 'tap',
    role: 'tap',
    live: false,
    track: 0,
    notes: [],
    controls: [{ controller: 'air', value: 3000, t: 1 }],
  });
  session.heard({
    owner: flower(1),
    kind: 'tap',
    role: 'tap',
    live: true,
    notes: [],
    changes: [{ index: 0, controller: 'volume', value: 0.5, t: 1 }],
  });
  assert.deepEqual(session.at(1.5, 1), {});
});

// Played back, a background track carries two senders' notes of one part: the live chord, held, and the recording's,
// each numbering its notes from 0.
// A note off of the playback's must not let go the live chord's note of the same index.
test("a held note let go only by its own sender's note off: the playback's of an index doesn't end the live garden's of that index", () => {
  const session = sessionOf({ groupOf: (kind) => (kind === 'ambient' ? 'background' : kind) });
  const drone = { kind: 'ambient' };
  const part = { owner: drone, kind: 'ambient', role: 'held 1', live: false, track: 0, until: Infinity };
  session.heard({ ...part, notes: [{ t: 1, pitch: 38, index: 0 }] }); // the live chord's note, held on
  session.heard({ ...part, playback: true, notes: [{ t: 2, pitch: 40, index: 0 }] }); // the recording's, played back
  session.heard({ ...part, playback: true, notes: [], ends: [{ index: 0, t: 3 }] }); // its note off, as playback stops
  assert.equal(session.at(5, 4.5)['background'].tracks[0].lit, true, 'the live chord held still');
  session.heard({ ...part, notes: [], ends: [{ index: 0, t: 6 }] }); // its own note off, at a key change
  assert.equal(session.at(7, 6.5)['background'].tracks[0].lit, false, 'let go by its own');
});

// played back, a replay's notes come as the recording has them, each note on and its note off apart, with no time its tail is done by: the
// track held by its notes, lit while they sound, then free, as your playing's is, not held for good
test('a played-back replay, its note on and note off apart and no end of its own, holds its track until its notes have ended, then frees it', () => {
  const session = sessionOf();
  const first = flower(1);
  const played = { owner: first, kind: 'tap', role: 'tap', live: false, track: 0, playback: true };
  session.heard({ ...played, notes: [{ t: 1, pitch: 60, index: 0 }] });
  assert.deepEqual(
    session.at(1.5, 0.5).tap.tracks[0],
    { owner: first, clip: first, lit: true, waiting: null },
    'lit as it sounds',
  );
  session.heard({ ...played, notes: [], ends: [{ index: 0, t: 1.75 }] });
  assert.equal(session.at(2, 1.5).tap.tracks[0].lit, true, 'ended since the last look: still lit');
  assert.deepEqual(
    session.at(3, 2.5).tap.tracks[0],
    { owner: null, clip: null, lit: false, waiting: null },
    'then free',
  );
});

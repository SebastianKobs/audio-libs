// The session's unit tests (mockup/src/libs/modular-audio/view/tracks/models/session.ts; mockup/architecture/views.md): what a session view shows of the
// stream, each kind's replay tracks and what plays on them, and the clips that sounded, looked at now and then
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../index.ts';

// a session as the view makes it: each kind's replays on its own group, your playing on none
// unless a test says
const session = (groups = {}) => {
  const { groupOf, myGroupOf } = { groupOf: (k) => k, myGroupOf: () => null, ...groups };
  return new Session({ groupOf: (kind, live) => (live ? myGroupOf(kind) : groupOf(kind)) });
};
const flower = (n) => ({ kind: 'tap', n });
// a replay: its notes short, each with its length, as every replayed note has had since G0i
const replay = (owner, track, times, until, more = {}) => ({
  owner,
  kind: owner.kind,
  role: 'tap',
  live: false,
  track,
  until,
  notes: times.map((t) => ({ t, pitch: 60, duration: 0.1 })),
  ...more,
});

test('a replay lights its clip and its track while its notes sound, and its track shows it until its tail is done', () => {
  const s = session();
  const a = flower(1);
  s.heard(replay(a, 0, [1, 1.5, 2], 4));
  assert.deepEqual(
    s.at(0.9, 0.5).tap,
    { tracks: [{ owner: null, clip: a, lit: false, waiting: a }], lit: new Set() },
    'placed, waiting for its first note',
  );
  assert.deepEqual(
    s.at(1.6, 0.9).tap,
    { tracks: [{ owner: a, clip: a, lit: true, waiting: null }], lit: new Set([a]) },
    'sounding',
  );
  assert.deepEqual(
    s.at(3, 2.5).tap,
    { tracks: [{ owner: a, clip: a, lit: false, waiting: null }], lit: new Set() },
    'its tail: its track still holds it, unlit',
  );
  assert.deepEqual(
    s.at(4.5, 3),
    { tap: { tracks: [{ owner: null, clip: null, lit: false, waiting: null }], lit: new Set() } },
    'done; the track stays',
  );
});

test('a replay shorter than the time between two looks still lights once', () => {
  const s = session();
  const a = flower(1);
  s.heard(replay(a, 0, [1.1, 1.2], 1.5));
  assert.equal(s.at(2, 1).tap.tracks[0].lit, true, 'it sounded since the last look');
  assert.equal(s.at(3, 2).tap.tracks[0].lit, false);
});

test('a held note lights for as long as it lasts', () => {
  const s = session();
  const b = { kind: 'bloom' };
  s.heard({
    owner: b,
    kind: 'bloom',
    role: 'hold',
    live: false,
    track: 0,
    until: 9,
    notes: [{ t: 1, pitch: 48, duration: 6 }],
  });
  assert.equal(s.at(6, 5).bloom.tracks[0].lit, true);
  assert.equal(s.at(8, 7.5).bloom.tracks[0].lit, false, 'its release');
});

test("your playing where the view gives it no group, and plays on no replay track, aren't the session's", () => {
  const s = session();
  const a = flower(1);
  s.heard({ ...replay(a, 0, [1], 2), live: true });
  s.heard({ owner: { kind: 'bass' }, kind: 'bass', role: 'bass', live: false, notes: [{ t: 1, pitch: 36 }] });
  assert.deepEqual(s.at(1.5, 0.5), {});
});

test('overlapping replays on their tracks; a kind keeps as many tracks as it ever used; visitors and residents share theirs', () => {
  const s = session({ groupOf: (k) => (k === 'resident' ? 'visitor' : k) });
  const [a, b] = [1, 2].map(flower);
  s.heard(replay(a, 0, [1], 3));
  s.heard(replay(b, 1, [1.2], 3));
  const now = s.at(1.5, 0.5).tap;
  assert.deepEqual(
    now.tracks.map((t) => t.owner),
    [a, b],
  );
  assert.deepEqual(now.lit, new Set([a, b]));
  assert.equal(s.at(10, 9).tap.tracks.length, 2, 'both tracks, long after');
  const v = { kind: 'visitor' };
  const r = { kind: 'resident' };
  s.heard({
    owner: v,
    kind: 'visitor',
    role: 'visitor',
    live: false,
    track: 0,
    until: 13,
    notes: [{ t: 11, pitch: 60 }],
  });
  s.heard({
    owner: r,
    kind: 'resident',
    role: 'resident',
    live: false,
    track: 1,
    until: 13,
    notes: [{ t: 11, pitch: 48 }],
  });
  assert.deepEqual(
    s.at(11.5, 10.5).visitor.tracks.map((t) => t.owner),
    [v, r],
  );
});

test('a loop holds its track for as long as it plays: lit on its notes, still shown between them, and its notes let go once heard', () => {
  const s = session({ groupOf: (k) => (['ambient', 'brushes', 'bass'].includes(k) ? 'background' : k) });
  const bass = { kind: 'bass' };
  for (let k = 0; k < 400; k++) {
    s.heard({
      owner: bass,
      kind: 'bass',
      role: 'bass',
      live: false,
      track: 2,
      until: Infinity,
      notes: [{ t: 4 * k, pitch: 36, duration: 1 }],
    });
  }
  assert.deepEqual(
    s.at(0.5, 0).background.tracks[2],
    { owner: bass, clip: bass, lit: true, waiting: null },
    'on a note',
  );
  assert.deepEqual(
    s.at(2.5, 2).background.tracks[2],
    { owner: bass, clip: bass, lit: false, waiting: null },
    'between its notes, still its track',
  );
  assert.equal(s.at(2.5, 2).background.tracks.length, 3, "its track's place kept");
  s.at(1000.5, 1000); // note 250 sounding
  assert.equal(s.kept(), 150, 'the notes heard are let go, but the one sounding and the 149 still to come');
});

test('a replay placed but not yet sounding shows on its track as waiting, as a launched clip waits in Ableton', () => {
  const s = session();
  const a = flower(1);
  const b = flower(2);
  s.heard(replay(a, 0, [1], 2));
  s.heard(replay(b, 0, [3], 4));
  assert.deepEqual(
    s.at(1.5, 0.5).tap.tracks[0],
    { owner: a, clip: a, lit: true, waiting: null },
    'a sounds; b waits behind it, unseen',
  );
  assert.deepEqual(s.at(2.5, 2).tap.tracks[0], { owner: null, clip: b, lit: false, waiting: b }, 'a done: b waits');
});

test("your playing goes on its kind's pool, its group, when the view gives one, on the track it was played on, held until it has rung out, as a replay holds its track (N3)", () => {
  const s = session({ myGroupOf: (k) => (k === 'tap' ? 'my tap' : null) });
  const [a, b] = [flower(1), flower(2)];
  const yours = (owner, track, t) => ({
    owner,
    kind: 'tap',
    role: 'tap',
    live: true,
    track,
    until: t + 1.5,
    notes: [{ t, pitch: 60, duration: 0.25 }],
  });
  s.heard(yours(a, 0, 1));
  s.heard(yours(b, 1, 1.25)); // overlapping a's tail: a track of its own
  s.heard({
    owner: { kind: 'bloom' },
    kind: 'bloom',
    role: 'hold',
    live: true,
    track: 0,
    notes: [{ t: 1, pitch: 48 }],
  }); // no group of yours for blooms
  assert.deepEqual(s.at(1.5, 0.5)['my tap'].tracks, [
    { owner: a, clip: a, lit: true, waiting: null },
    { owner: b, clip: b, lit: true, waiting: null },
  ]);
  assert.deepEqual(Object.keys(s.at(1.5, 0.5)), ['my tap'], 'none for a kind with no group of yours');
  assert.equal(s.at(1.5, 0.5)['my tap'].lit.has(a), true);
  assert.equal(s.at(2.25, 2).tap, undefined);
  assert.deepEqual(
    s.at(2.25, 2)['my tap'].tracks[0],
    { owner: a, clip: a, lit: false, waiting: null },
    'its note done, its tail ringing: a holds its track',
  );
  assert.equal(s.at(2.75, 2.5)['my tap'].tracks[0].owner, null, 'rung out: its track free');
});

test("your playing on no pool track, a recording's from before N2: not the session's (N3)", () => {
  const s = session({ myGroupOf: () => 'my tap' });
  s.heard({ owner: flower(1), kind: 'tap', role: 'tap', live: true, track: null, notes: [{ t: 1, pitch: 60 }] });
  assert.deepEqual(s.at(1.5, 0.5), {});
});

test("a play can name the clip it plays, as a visitor's song names its motif: that clip lights, and its track says it", () => {
  const s = session();
  const v = { kind: 'visitor' };
  s.heard({
    owner: v,
    kind: 'visitor',
    role: 'visitor',
    live: false,
    track: 0,
    until: 3,
    clip: 'ask',
    notes: [{ t: 1, pitch: 60 }],
  });
  const at = s.at(1.5, 0.5).visitor;
  assert.deepEqual(at.lit, new Set(['ask']), 'its clip lights, not its singer');
  assert.equal(at.tracks[0].owner, v);
  assert.equal(at.tracks[0].clip, 'ask');
});

test("a note with no length, held until its note off, lights for as long as its play holds its track, as the background's held sound (G0.1b2)", () => {
  const s = session({ groupOf: (k) => (['ambient', 'brushes', 'bass'].includes(k) ? 'background' : k) });
  const drone = { kind: 'ambient' };
  s.heard({
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
    s.at(600.5, 600).background.tracks[0],
    { owner: drone, clip: drone, lit: true, waiting: null },
    'ten minutes on',
  );
});

test("a held note lights from its note on until its note off comes as a play of its own (G2a): your phrase note on its pool track, held until it's let go (N3), a held part's on its", () => {
  const s = session({
    groupOf: (k) => (k === 'ambient' ? 'background' : k),
    myGroupOf: (k) => (k === 'vine' ? 'my trace' : null),
  });
  const vine = { kind: 'vine' };
  s.heard({
    owner: vine,
    kind: 'vine',
    role: 'trace',
    live: true,
    track: 2,
    until: Infinity,
    notes: [{ t: 1, pitch: 60, index: 4 }],
  });
  assert.equal(s.at(3, 2.5)['my trace'].tracks[2].lit, true, 'held: lit two seconds on');
  s.heard({ owner: vine, kind: 'vine', role: 'trace', live: true, track: 2, notes: [], ends: [{ index: 4, t: 3.5 }] });
  assert.equal(s.at(4, 3)['my trace'].tracks[2].lit, true, 'let go since the last look');
  assert.equal(s.at(5, 4.5)['my trace'].tracks[2].lit, false, 'let go');
  assert.equal(s.at(5, 4.5)['my trace'].tracks[2].owner, null, 'its track free');
  const drone = { kind: 'ambient' };
  const part = { owner: drone, kind: 'ambient', role: 'held 1', live: false, track: 0, until: Infinity };
  s.heard({ ...part, notes: [{ t: 1, pitch: 38, index: 1 }] });
  s.heard({ ...part, notes: [], ends: [{ index: 1, t: 10 }] });
  assert.equal(s.at(9.5, 9)['background'].tracks[0].lit, true, 'held until its key changes');
  assert.equal(s.at(11, 10.5)['background'].tracks[0].lit, false, 'let go there');
});

test("a track's own controllers, and a note's changes after it, a play of their own with no notes (G3a): nothing the session shows, no group made", () => {
  const s = session({ myGroupOf: (kind) => (kind === 'tap' ? 'my tap' : null) });
  s.heard({
    owner: null,
    kind: 'tap',
    role: 'tap',
    live: false,
    track: 0,
    notes: [],
    controls: [{ controller: 'air', value: 3000, t: 1 }],
  });
  s.heard({
    owner: flower(1),
    kind: 'tap',
    role: 'tap',
    live: true,
    notes: [],
    changes: [{ index: 0, controller: 'volume', value: 0.5, t: 1 }],
  });
  assert.deepEqual(s.at(1.5, 1), {});
});

// played back, a background track carries two senders' notes of one part: the live garden's held chord, hushed, and the recording's,
// each numbering its notes from 0. A note off of the playback's let go the live chord's note of its index too, and the track showed nothing
// as the chord sounded on (P3b, found after it was committed)
test("a held note let go only by its own sender's note off: the playback's of an index doesn't end the live garden's of that index", () => {
  const s = session({ groupOf: (k) => (k === 'ambient' ? 'background' : k) });
  const drone = { kind: 'ambient' };
  const part = { owner: drone, kind: 'ambient', role: 'held 1', live: false, track: 0, until: Infinity };
  s.heard({ ...part, notes: [{ t: 1, pitch: 38, index: 0 }] }); // the live chord's note, held on
  s.heard({ ...part, playback: true, notes: [{ t: 2, pitch: 40, index: 0 }] }); // the recording's, played back
  s.heard({ ...part, playback: true, notes: [], ends: [{ index: 0, t: 3 }] }); // its note off, as playback stops
  assert.equal(s.at(5, 4.5)['background'].tracks[0].lit, true, 'the live chord held still');
  s.heard({ ...part, notes: [], ends: [{ index: 0, t: 6 }] }); // its own note off, at a key change
  assert.equal(s.at(7, 6.5)['background'].tracks[0].lit, false, 'let go by its own');
});

// played back, a replay's notes come as the recording has them, each note on and its note off apart, with no time its tail is done by: the
// track held by its notes, lit while they sound, then free, as your playing's is, not held for good
test('a played-back replay, its note on and note off apart and no end of its own, holds its track until its notes have ended, then frees it', () => {
  const s = session();
  const a = flower(1);
  const played = { owner: a, kind: 'tap', role: 'tap', live: false, track: 0, playback: true };
  s.heard({ ...played, notes: [{ t: 1, pitch: 60, index: 0 }] });
  assert.deepEqual(s.at(1.5, 0.5).tap.tracks[0], { owner: a, clip: a, lit: true, waiting: null }, 'lit as it sounds');
  s.heard({ ...played, notes: [], ends: [{ index: 0, t: 1.75 }] });
  assert.equal(s.at(2, 1.5).tap.tracks[0].lit, true, 'ended since the last look: still lit');
  assert.deepEqual(s.at(3, 2.5).tap.tracks[0], { owner: null, clip: null, lit: false, waiting: null }, 'then free');
});

// What the session view's desk shows of a look at the session (modular-audio/view/tracks/models/session-tracks.ts): the tracks
// with notes in their groups, in the order the control surface gives them, those played live marked; each track's name, its address on
// the desk and what it plays now; what sounded since the last look, for the folded sections' lights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionTracks } from '../index.ts';

// the tracks as a control surface names them: your taps' pool, then the flowers' replays, then the vines'
const TRACKS = {
  groups: [
    { group: 'my tap', name: 'my tap', kind: 'tap', live: true },
    { group: 'flower', name: 'flowers', kind: 'flower', live: false },
    { group: 'vine', name: 'vines', kind: 'vine', live: false },
  ],
  clipName: (clip, kind) => `${kind} ${clip.n}`,
};
// a track's channel on the desk, by its group and its number
const trackAt = ({ kind, track }) => `${kind}/${track + 1}`;
// a look: your second tap track lit, playing tap 3; a flower's replay waiting on its first track, its clip lit; no vines
const SEEN = {
  'my tap': {
    tracks: [
      { owner: null, clip: null, lit: false, waiting: null },
      { owner: { n: 3 }, clip: null, lit: true, waiting: null },
    ],
    lit: new Set(),
  },
  flower: {
    tracks: [{ owner: null, clip: 'motif', lit: false, waiting: { n: 7 } }],
    lit: new Set(['a clip']),
  },
  vine: { tracks: [], lit: new Set() },
};

test("the tracks with notes in their groups, in the control surface's order, those played live marked; a group with none not shown", () => {
  assert.deepEqual(
    sessionTracks()
      .groups(SEEN)
      .map(({ key, name, live, tracks: shown }) => [key, name, live, shown.length]),
    [
      ['my tap', 'my tap', true, 2],
      ['flower', 'flowers', false, 1],
    ],
  );
});

test("each track named from its group's name and numbered from 1, at its address on the desk; what it plays now, dimmed while a replay waits for its first note, a dash with none", () => {
  const [mine, flowers] = sessionTracks().groups(SEEN);
  assert.deepEqual(
    mine.tracks.map(({ address, name, now, playing }) => [address, name, now, playing]),
    [
      [['my tap', '1'], 'my tap 1', { text: '—', lit: false, waiting: false }, false],
      [['my tap', '2'], 'my tap 2', { text: 'tap 3', lit: true, waiting: false }, true],
    ],
  );
  assert.deepEqual(
    flowers.tracks[0].now,
    { text: 'flower 7 · motif', lit: false, waiting: true },
    "its kind's clip, a visitor's motif named",
  );
});

test("what sounded since the last look: a replay group's clips, by its key, and each lit track's channel; your clips none", () => {
  assert.deepEqual([...sessionTracks().sounded(SEEN)].sort(), ['clips flower', 'my tap/2']);
});

function sessionTracks() {
  return new SessionTracks({ tracks: TRACKS, trackAt });
}

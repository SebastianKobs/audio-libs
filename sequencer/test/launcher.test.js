// The clip launcher (mockup/src/libs/sequencer/launcher.ts; mockup/architecture/tests.md), on events of their own, not notes: a light's
// cues, each a colour on a 16th, looping on a track, handed on as each comes due, on the swing or straight under it; one clip a track, each
// launch numbered
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClipLauncher } from '../launcher.ts';
import { STEP } from '../../clock/index.ts';
import { SIXTEENTH, SWING, swungGrid } from './swung-grid.js';

const grid = swungGrid; // every odd 16th SWING late
// a launcher that keeps what it hands on: each cue's track, colour, time and launch
function launcher() {
  const handed = [];
  const clips = new ClipLauncher({
    grid,
    play: (track, cue, at, launch) => handed.push([track, cue.colour, at, launch]),
  });
  return { handed, clips };
}
// a one-bar clip of cues: amber on the one, blue on the second 16th, violet a triplet into the third
const cues = {
  bars: 1,
  loop: true,
  events: [
    { start: 0, colour: 'amber' },
    { start: STEP, colour: 'blue' },
    { start: 2 * STEP + 16, colour: 'violet' },
  ],
};

test('a launched clip hands on each event as its 16th comes, at its time on the swing, an event off the 16th where it falls, round its loop', () => {
  const { handed, clips } = launcher();
  clips.launch({ track: 'lamp', pattern: cues });
  clips.step(0, 0);
  clips.step(1, SIXTEENTH + SWING);
  clips.step(2, 2 * SIXTEENTH);
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(handed, [
    ['lamp', 'amber', 0, 1],
    ['lamp', 'blue', SIXTEENTH + SWING, 1],
    ['lamp', 'violet', grid.timeAt(2 + 16 / STEP), 1],
    ['lamp', 'amber', 16 * SIXTEENTH, 1],
  ]);
});

test("a straight clip plays under the swing: a swung 16th's event at its straight time, an offset one on the straight grid", () => {
  const { handed, clips } = launcher();
  clips.launch({ track: 'lamp', pattern: cues, straight: true });
  clips.step(1, SIXTEENTH + SWING);
  clips.step(2, 2 * SIXTEENTH);
  assert.deepEqual(handed, [
    ['lamp', 'blue', SIXTEENTH, 1],
    ['lamp', 'violet', 2 * SIXTEENTH + (16 / STEP) * SIXTEENTH, 1],
  ]);
});

test('one clip a track: a launch replaces what it played, keeping its place in the order; stop() ends it; each launch a number of its own', () => {
  const { handed, clips } = launcher();
  const one = { bars: 1, loop: true, events: [{ start: 0, colour: 'red' }] };
  const two = { bars: 1, loop: true, events: [{ start: 0, colour: 'green' }] };
  assert.equal(clips.launch({ track: 'lamp', pattern: one }), 1);
  assert.equal(clips.launch({ track: 'strobe', pattern: two }), 2);
  assert.equal(clips.launch({ track: 'lamp', pattern: two }), 3);
  clips.step(0, 0);
  clips.stop('strobe');
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(handed, [
    ['lamp', 'green', 0, 3],
    ['strobe', 'green', 0, 2],
    ['lamp', 'green', 16 * SIXTEENTH, 3],
  ]);
});

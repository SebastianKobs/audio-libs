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

test('a clip played once waits for the next beat, plays from its first event to its last, each in its place in the beat, then ends; its span told as it starts', () => {
  const handed = [];
  const told = [];
  const clips = new ClipLauncher({
    grid,
    play: (track, cue, at, launch) => handed.push([track, cue.colour, at, launch]),
    started: (track, launch, span) => told.push(['started', track, launch, span]),
    ended: (track, launch) => told.push(['ended', track, launch]),
  });
  // kept off the beat: its first a 16th into a beat, its last a beat and a 16th later, 2 16ths long
  const phrase = {
    bars: 4,
    events: [
      { start: 9 * STEP, colour: 'amber' },
      { start: 13 * STEP, duration: 2 * STEP, colour: 'blue' },
    ],
  };
  clips.launch({ track: 'lamp', pattern: phrase, once: true });
  clips.step(2, 2 * SIXTEENTH); // not a beat: waits
  clips.step(4, 4 * SIXTEENTH); // the next beat: starts, its first a 16th in
  clips.step(5, 5 * SIXTEENTH + SWING);
  clips.step(9, 9 * SIXTEENTH + SWING);
  clips.step(10, 10 * SIXTEENTH);
  clips.step(13, 13 * SIXTEENTH + SWING); // round no loop: nothing
  assert.deepEqual(handed, [
    ['lamp', 'amber', 5 * SIXTEENTH + SWING, 1],
    ['lamp', 'blue', 9 * SIXTEENTH + SWING, 1],
  ]);
  assert.deepEqual(told, [
    ['started', 'lamp', 1, { from: 5 * SIXTEENTH + SWING, until: 9 * SIXTEENTH + SWING + 2 * SIXTEENTH }],
    ['ended', 'lamp', 1],
  ]);
});

test('launched again before it has started or while it plays: from the next beat again, the first launch told no end', () => {
  const handed = [];
  const ended = [];
  const clips = new ClipLauncher({
    grid,
    play: (track, cue, at, launch) => handed.push([cue.colour, at, launch]),
    ended: (track, launch) => ended.push(launch),
  });
  const phrase = {
    bars: 1,
    events: [
      { start: 0, colour: 'amber' },
      { start: 6 * STEP, colour: 'blue' },
    ],
  };
  clips.launch({ track: 'lamp', pattern: phrase, once: true });
  clips.step(0, 0);
  clips.launch({ track: 'lamp', pattern: phrase, once: true }); // its second note still to come
  clips.step(4, 4 * SIXTEENTH);
  clips.step(6, 6 * SIXTEENTH);
  clips.step(10, 10 * SIXTEENTH);
  assert.deepEqual(handed, [
    ['amber', 0, 1],
    ['amber', 4 * SIXTEENTH, 2],
    ['blue', 10 * SIXTEENTH, 2],
  ]);
  assert.deepEqual(ended, [2]);
});

test('an event of its own straight or swung, in place of its clip: a straight one in a swung clip at its straight time', () => {
  const { handed, clips } = launcher();
  const mixed = { bars: 1, loop: true, events: [{ start: STEP, colour: 'blue', straight: true }] };
  clips.launch({ track: 'lamp', pattern: mixed });
  clips.step(1, SIXTEENTH + SWING);
  assert.deepEqual(handed, [['lamp', 'blue', SIXTEENTH, 1]]);
});

test('a clip played once with no events: ended on its beat, no start told', () => {
  const told = [];
  const clips = new ClipLauncher({
    grid,
    play: () => {},
    started: () => told.push('started'),
    ended: () => told.push('ended'),
  });
  clips.launch({ track: 'lamp', pattern: { bars: 1, events: [] }, once: true });
  clips.step(0, 0);
  clips.step(4, 4 * SIXTEENTH);
  assert.deepEqual(told, ['ended']);
});

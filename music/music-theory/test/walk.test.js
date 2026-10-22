// A contour walked (mockup/src/libs/music/music-theory/walk.ts), a step at a time, from a root that moves
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkOn } from '../index.ts';

test("a contour walked from a root that moves, as a vine's under your finger: on, step by step, and from its start on a new root", () => {
  const c = [0, 2, 1, 3];
  let w = null;
  const steps = [5, 5, 5, 5, 5, 6, 6, 5].map((root) => (w = walkOn(c, w, root)).step);
  assert.deepEqual(steps, [0, 2, 1, 3, 0, 0, 2, 0], 'round the contour on one root; from its start on each new one');
  assert.deepEqual(walkOn(c, null, 5), { root: 5, position: 0, step: 0 }, 'the first note: the root itself');
});

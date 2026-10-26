// A lane's value at a time, the sequencer's (mockup/src/libs/sequencing/midi-sequencer/lanes.ts): as Web
// Audio plays its points, a jump at once, a glide by its time constant, as setTargetAtTime goes; and its last point's, its glide not followed
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastValueAt, laneValueAt } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test("a lane's value at a time: none before its first point, a jump's value from its time, a glide's where it had got to from where the lane was, a glide after a glide from where the first had got to", () => {
  const points = [
    { t: 1, value: 0 },
    { t: 2, value: 1, glide: 0.5 },
    { t: 4, value: 2 },
  ];
  assert.equal(laneValueAt(points, 0.5), undefined);
  assert.equal(laneValueAt(points, 1.5), 0);
  near(laneValueAt(points, 2), 0, 'as the glide starts', 1e-12);
  near(laneValueAt(points, 2.5), 1 - Math.exp(-1), 'a time constant on', 1e-12);
  assert.equal(laneValueAt(points, 5), 2, 'the jump after it');
  const glides = [
    { t: 0, value: 0 },
    { t: 1, value: 1, glide: 1 },
    { t: 2, value: 0, glide: 1 },
  ];
  const reached = 1 - Math.exp(-1);
  near(laneValueAt(glides, 2), reached, 'the second as it starts', 1e-12);
  near(laneValueAt(glides, 3), reached * Math.exp(-1), 'and a time constant on', 1e-12);
});

test("a lane's last point's value by a time, a glide's its value: what it was set to, its curve not followed; none before its first", () => {
  const points = [
    { t: 1, value: 0 },
    { t: 2, value: 1, glide: 0.5 },
  ];
  assert.equal(lastValueAt(points, 0.5), undefined);
  assert.equal(lastValueAt(points, 1.5), 0);
  assert.equal(lastValueAt(points, 2), 1);
});

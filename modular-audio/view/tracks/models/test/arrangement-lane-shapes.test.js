// modular-audio/view/tracks/models/arrangement/lane-shapes.ts: a lane's line as Web Audio plays its
// points, a jump a step, a glide setTargetAtTime's curve
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laneLine } from '../index.ts';
import { near, isNear } from '../../../../../base/util/test/near.js';

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
  const at = (t) => line.find((corner) => isNear(corner.t, t)).value;
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

// The timeline (mockup/src/libs/timeline/; mockup/architecture/tests.md), on events of their own, not notes: a hand's presses, each with
// its own length or held open until its release, and a pointer's pressure, events that hold until the next of their key
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timeline, thinned } from '../index.ts';

// a press: when, by which finger, and how long, none while it's held
function press(t, finger, duration) {
  if (duration === undefined) {
    return { t, finger };
  }
  return { t, finger, duration };
}
const level = (t, value) => ({ t, value });
const sameLevel = (before, after) => before.value === after.value;

test('events with their own length or open, kept in the order they came; an open one ended once its end is told, never before it starts', () => {
  const timeline = new Timeline();
  const held = press(0.5, 1);
  timeline.add([press(1, 0, 0.5), held]);
  timeline.add([]);
  assert.deepEqual(timeline.events(), [press(1, 0, 0.5), press(0.5, 1)]);
  timeline.endAt(held, 2);
  assert.equal(held.duration, 1.5);
  const early = press(3, 2);
  timeline.add([early]);
  timeline.endAt(early, 2);
  assert.equal(early.duration, 0, 'ended before it began: no length, never less');
});

test('events that hold until the next of their key: in time order, one after those at its time; their keys in the order they began', () => {
  const timeline = new Timeline();
  timeline.hold('pressure', level(2, 0.5));
  timeline.hold('pressure', level(1, 0.2));
  timeline.hold('pressure', level(2, 0.7));
  timeline.hold('tilt', level(1, 0));
  assert.deepEqual(timeline.keys(), ['pressure', 'tilt']);
  assert.deepEqual(timeline.held('pressure'), [level(1, 0.2), level(2, 0.5), level(2, 0.7)]);
  assert.deepEqual(timeline.held('none'), []);
});

test("kept for a window: an event that ended before it let go, an open one kept; of each key's, those before it let go but the one still in effect; who went told", () => {
  const gone = [];
  const timeline = new Timeline({ keep: 10, onLetGo: (events) => gone.push(...events) });
  timeline.add([press(1, 0, 1), press(2, 1)]);
  for (const [t, value] of [
    [1, 1],
    [3, 2],
    [15, 3],
  ]) {
    timeline.hold('pressure', level(t, value));
  }
  timeline.settle(20);
  assert.deepEqual(timeline.events(), [press(2, 1)]);
  assert.deepEqual(timeline.held('pressure'), [level(3, 2), level(15, 3)]);
  assert.deepEqual(gone, [press(1, 0, 1), level(1, 1)]);
  timeline.settle(20);
  assert.equal(gone.length, 2, 'each told once');
});

test('its window, unless told: the last 30 minutes', () => {
  const timeline = new Timeline();
  timeline.add([press(0, 0, 1)]);
  timeline.add([press(1800.5, 1, 1)]);
  assert.equal(timeline.events().length, 2, 'ended 30 minutes ago, less half a second: kept');
  timeline.add([press(1802, 2, 1)]);
  assert.deepEqual(
    timeline.events(),
    [press(1800.5, 1, 1), press(1802, 2, 1)],
    'ended more than 30 minutes ago: let go',
  );
});

test("what's past the window let go as events are added, at most once a second of their time, without settling", () => {
  const gone = [];
  const timeline = new Timeline({ keep: 10, onLetGo: (events) => gone.push(...events) });
  timeline.add([press(1, 0, 1), press(80, 2, 10.5)]);
  timeline.add([press(100, 1, 1)]);
  assert.deepEqual(
    timeline.events(),
    [press(80, 2, 10.5), press(100, 1, 1)],
    'the window from 90: one ending at 90.5 kept',
  );
  assert.deepEqual(gone, [press(1, 0, 1)]);
  timeline.add([press(100.6, 3, 1)]);
  assert.equal(timeline.events().length, 3, 'not a second on yet: nothing let go, though one ended before the window');
  timeline.add([press(101, 4, 1)]);
  assert.deepEqual(gone, [press(1, 0, 1), press(80, 2, 10.5)], 'a second on: let go');
});

test("an event that holds what the one before it of its key held, by the caller's equality, thinned once it's a second past; one not settled yet kept; none by default", () => {
  const points = [level(1, 0.5), level(2, 0.5), level(3, 0.6), level(4, 0.6), level(10, 0.6)];
  const timeline = new Timeline({ same: sameLevel });
  const everything = new Timeline();
  for (const point of points) {
    timeline.hold('pressure', point);
    everything.hold('pressure', point);
  }
  timeline.settle(10.5);
  everything.settle(10.5);
  assert.deepEqual(timeline.held('pressure'), [level(1, 0.5), level(3, 0.6), level(10, 0.6)]);
  assert.equal(everything.held('pressure').length, 5);
});

test('thinned(): events that change nothing left out once settled, the first against where it starts from, if given', () => {
  assert.deepEqual(thinned([level(2, 0.3), level(3, 0.6), level(4, 0.6)], 10, sameLevel, level(1, 0.3)), [
    level(3, 0.6),
  ]);
  assert.deepEqual(thinned([level(2, 0.3), level(3, 0.3)], 2.5, sameLevel), [level(2, 0.3), level(3, 0.3)]);
});

test("what's in effect at a time: an event under way, an open one, each key's latest by then; and what starts in a range, from its start, before its end", () => {
  const timeline = new Timeline();
  timeline.add([press(1, 0, 2), press(2, 1), press(5, 2, 1)]);
  timeline.hold('pressure', level(0, 0.1));
  timeline.hold('pressure', level(4, 0.2));
  assert.deepEqual(timeline.inEffectAt(2.5), [press(1, 0, 2), press(2, 1), level(0, 0.1)]);
  assert.deepEqual(timeline.inEffectAt(3), [press(2, 1), level(0, 0.1)], 'one ended as its length ends');
  assert.deepEqual(timeline.inEffectAt(4.5), [press(2, 1), level(4, 0.2)]);
  assert.deepEqual(timeline.startingIn(2, 5), [press(2, 1), level(4, 0.2)]);
});

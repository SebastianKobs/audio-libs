// Changes to a desk's params held until their time (mockup/src/libs/desk-plan/changes.ts, U2c5a): a change by its param's key, its value
// and its time, set at once once its time has come, else kept until the clock's tick brings it, those kept set in their time's order;
// on a clock of the test's own, its now and its ticks
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HeldChanges } from '../index.ts';

// a clock of the test's own: its time now, and its ticks, each handed the time it's at
function clockAt(start) {
  const listeners = [];
  const clock = {
    time: start,
    now: () => clock.time,
    onTick: (listener) => {
      listeners.push(listener);
      return () => {};
    },
    tick: (t) => {
      clock.time = t;
      for (const listener of listeners) {
        listener(t);
      }
    },
  };
  return clock;
}

test('a change set at once once its time has come; one for later kept until a tick brings its time, those kept in their order', () => {
  const clock = clockAt(10);
  const set = [];
  const changes = new HeldChanges({
    clock,
    set: (change) => set.push(`${change.key.strip}/${change.key.param} ${change.value}`),
  });
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.5, t: 10 });
  changes.change({ key: { strip: 'you', param: 'pan' }, value: 0.25, t: 9 });
  assert.deepEqual(set, ['you/volume 0.5', 'you/pan 0.25'], 'its time come or gone: at once');
  changes.change({ key: { strip: 'you', param: 'mute' }, value: 1, t: 12 });
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.7, t: 11 });
  clock.tick(10.5);
  assert.equal(set.length, 2, 'kept until its time');
  clock.tick(12);
  assert.deepEqual(
    set.slice(2),
    ['you/volume 0.7', 'you/mute 1'],
    "each as a tick brings its time, in its time's order",
  );
  clock.tick(13);
  assert.equal(set.length, 4, 'each set once');
});

test('a change with a lead: set at once once its time is that close, else kept until a tick brings it that close', () => {
  const clock = clockAt(10);
  const set = [];
  const changes = new HeldChanges({ clock, lead: 0.1, set: (change) => set.push(change.value) });
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.5, t: 10.05 });
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.6, t: 10.5 });
  assert.deepEqual(set, [0.5], 'within its lead: at once');
  clock.tick(10.3);
  assert.deepEqual(set, [0.5], 'kept');
  clock.tick(10.4);
  assert.deepEqual(set, [0.5, 0.6], 'as a tick brings it within its lead');
});

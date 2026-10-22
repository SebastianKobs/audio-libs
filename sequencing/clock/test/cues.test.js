// The clock's cues (mockup/src/libs/sequencing/clock/cues.ts): items held until a tick brings their time,
// less a lead where one's given, then handed on in their order; the ticks the owner's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cues } from '../index.ts';

// cues handing on each item's name, into a list the test reads
function cuesInto(handedOn, lead) {
  return new Cues({ timeOf: (item) => item.t, handOn: (item) => handedOn.push(item.name), lead });
}

test('items held until a tick brings their time, then handed on in their order, those at one time as they came; each once', () => {
  const handedOn = [];
  const cues = cuesInto(handedOn);
  cues.hold({ name: 'late', t: 12 });
  cues.hold({ name: 'first', t: 11 });
  cues.hold({ name: 'second', t: 11 });
  cues.tick(10.5);
  assert.deepEqual(handedOn, [], 'none yet');
  cues.tick(11);
  assert.deepEqual(handedOn, ['first', 'second'], 'at their time');
  cues.tick(13);
  cues.tick(14);
  assert.deepEqual(handedOn, ['first', 'second', 'late'], 'each once');
});

test('an item held whose time has come waits for the next tick', () => {
  const handedOn = [];
  const cues = cuesInto(handedOn);
  cues.hold({ name: 'gone', t: 9 });
  assert.deepEqual(handedOn, []);
  cues.tick(10);
  assert.deepEqual(handedOn, ['gone']);
});

test('with a lead: handed on that far ahead of their time', () => {
  const handedOn = [];
  const cues = cuesInto(handedOn, 0.1);
  cues.hold({ name: 'ahead', t: 10.5 });
  cues.tick(10.3);
  assert.deepEqual(handedOn, [], 'not that close yet');
  cues.tick(10.4);
  assert.deepEqual(handedOn, ['ahead'], 'within its lead');
});

test('an item cued: handed on at once if its time has come, less the lead; else held until a tick brings it', () => {
  const handedOn = [];
  const cues = cuesInto(handedOn, 0.1);
  cues.cue({ name: 'now', t: 10 }, 10);
  cues.cue({ name: 'gone', t: 9 }, 10);
  cues.cue({ name: 'within its lead', t: 10.05 }, 10);
  assert.deepEqual(handedOn, ['now', 'gone', 'within its lead'], 'at once');
  cues.cue({ name: 'later', t: 11 }, 10);
  assert.equal(handedOn.length, 3, 'held');
  cues.tick(10.9);
  assert.deepEqual(handedOn.at(-1), 'later', 'as a tick brings it within its lead');
});

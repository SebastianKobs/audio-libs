// The timed events' unit tests (dsp/oscillators/): events added at their times in the context's seconds, handed out
// in a block at their frames, in time order, each once. No audio: a clock and a block length.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimedEvents } from '../index.ts';

const RATE = 48000;
const BLOCK = 128;
const at = (currentTime) => ({ sampleRate: RATE, currentTime });

// every event handed out in a block, with its frame
function dueIn(events, clock) {
  const handed = [];
  events.due(clock, BLOCK, (event, frame) => handed.push([event, frame]));
  return handed;
}

test('an event in this block is handed out at its frame', () => {
  const events = new TimedEvents();
  events.add(1 + 64 / RATE, 'pluck');
  assert.deepEqual(dueIn(events, at(1)), [['pluck', 64]]);
});

test('each event is handed out once', () => {
  const events = new TimedEvents();
  events.add(1, 'pluck');
  dueIn(events, at(1));
  assert.deepEqual(dueIn(events, at(1 + BLOCK / RATE)), []);
});

test('an event after this block waits for its own', () => {
  const events = new TimedEvents();
  events.add(1 + (BLOCK + 10) / RATE, 'later');
  assert.deepEqual(dueIn(events, at(1)), [], 'not in this block');
  assert.deepEqual(dueIn(events, at(1 + BLOCK / RATE)), [['later', 10]], 'in its own');
});

test('a late event is handed out at the first frame', () => {
  const events = new TimedEvents();
  events.add(0.5, 'late');
  assert.deepEqual(dueIn(events, at(1)), [['late', 0]]);
});

test('events are handed out in time order, those at one time in the order they were added', () => {
  const events = new TimedEvents();
  events.add(1 + 20 / RATE, 'third');
  events.add(1 + 10 / RATE, 'first');
  events.add(1 + 10 / RATE, 'second');
  assert.deepEqual(dueIn(events, at(1)), [
    ['first', 10],
    ['second', 10],
    ['third', 20],
  ]);
});

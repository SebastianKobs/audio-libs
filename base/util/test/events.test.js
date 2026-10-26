// libs/base/util/events.ts and bus.ts: events by name and messages by type, each to whoever listens
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bus, Events } from '../index.ts';

test("events by name: each listener called in the order it came, with the event's arguments; on() hands back a way to stop listening", () => {
  const events = new Events();
  const heard = [];
  events.on('clip launched', (clip, at) => heard.push(['first', clip, at]));
  const stop = events.on('clip launched', (clip) => heard.push(['second', clip]));
  events.on('clip deleted', (clip) => heard.push(['deleted', clip]));
  events.emit('clip launched', 'flowers 1', 2.5);
  stop();
  stop(); // a second time does nothing
  events.emit('clip launched', 'vines 1', 3);
  events.emit('nothing listens', 1);
  assert.deepEqual(heard, [
    ['first', 'flowers 1', 2.5],
    ['second', 'flowers 1'],
    ['first', 'vines 1', 3],
  ]);
});

test('a listener that stops listening as it is called: the others still hear that event; on and emit work handed on alone', () => {
  const events = new Events();
  const { on, emit } = events; // as a module hands on its on() (gestures/tracker.ts, session-view/clips.ts)
  const heard = [];
  const stop = on('step', () => {
    heard.push('once');
    stop();
  });
  on('step', (i) => heard.push(i));
  emit('step', 1);
  emit('step', 2);
  assert.deepEqual(heard, ['once', 1, 2]);
});

test('a bus: a message sent, a value with its type, reaches whoever listens to its type, as it was sent; a listener stops; send and on work handed on alone', () => {
  const bus = new Bus();
  const { send, on } = bus; // as main.ts hands the views send() alone
  const heard = [];
  on('clip launched', (message) => heard.push(['first', message]));
  const stop = on('clip launched', (message) => heard.push(['second', message.slot]));
  on('stop', (message) => heard.push(['stopped', message]));
  const launch = { type: 'clip launched', slot: 'flowers 1' };
  send(launch);
  stop();
  send({ type: 'clip launched', slot: 'vines 1' });
  send({ type: 'tempo', bpm: 90 }); // none listens
  assert.deepEqual(heard, [
    ['first', launch],
    ['second', 'flowers 1'],
    ['first', { type: 'clip launched', slot: 'vines 1' }],
  ]);
  assert.equal(heard[0][1], launch, 'the very value sent: it could be kept as it is');
});

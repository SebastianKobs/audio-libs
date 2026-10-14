// A desk as data (mockup/src/libs/desk-plan/strip-data.ts, U2c3; libs/web-audio-mixer/'s until U2c4a3): the routing made from a desk's
// strips, before there's any sound. Building them is libs/web-audio-mixer/'s (its build.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routingOf } from '../index.ts';

// a desk as data: a reverb, a delay sending to it into a bus, the bus into the master
const DESK = [
  { fx: 'reverb', chain: [{ effect: 'room' }], inserts: [{ slot: 'level', device: 'utility', start: { level: 0.6 } }] },
  { bus: 'sings' },
  { fx: 'delay', chain: [{ effect: 'echo' }], sends: ['reverb'], out: 'sings' },
];

test("the desk's routing from its data, before there's any sound: each strip a return or a bus, where it goes, what it sends to", () => {
  const routing = routingOf(DESK);
  assert.deepEqual(
    ['reverb', 'sings', 'delay'].map((name) => [routing.kindOf(name), routing.outOf(name), [...routing.sentTo(name)]]),
    [
      ['return', 'master', []],
      ['bus', 'master', []],
      ['return', 'sings', ['reverb']],
    ],
  );
});

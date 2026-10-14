// A desk as data (mockup/src/libs/desk-plan/strip-data.ts, U2c3; libs/web-audio-mixer/'s until U2c4a3): the routing made from a desk's
// strips, before there's any sound. Building them is libs/web-audio-mixer/'s (its build.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryIn, routingOf } from '../index.ts';

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

test("a strip's data by its name: the master's, a desk strip's, a track's template's; none for one it doesn't have", () => {
  const master = { inserts: [{ slot: 'limiter', device: 'limiter' }] };
  const sings = { bus: 'sings' };
  const air = { inserts: [{ slot: 'air', device: 'filter' }] };
  const data = { desk: [sings], master, templateOf: (strip) => (strip === 'replay 1' ? air : null) };
  assert.deepEqual(
    ['master', 'sings', 'replay 1', 'nowhere'].map((strip) => entryIn(data, strip)),
    [master, sings, air, undefined],
  );
  assert.deepEqual(entryIn({ desk: [sings] }, 'master'), {}, 'a master with no data: no slots');
});

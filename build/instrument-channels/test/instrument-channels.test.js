// A track's sounding end (mockup/src/libs/build/instrument-channels/), on a desk of the test's own: a track's way into
// its channel, a strip's controllers set, its own strips:
//   - a channel for a track's key, made the first time it's asked for, then kept;
//   - what's on it, as its owner says: its role; its instrument, made at its first note, plugged into its channel;
//   - its controllers its strip's, on the desk;
//   - a strip of the desk's own: no instrument, its controllers the desk's; a key with neither refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentChannelFactory } from '../index.ts';

// a desk of the test's own: each controller set recorded; a way into each pool track's channel; the master its own strip
function deskOf() {
  const controlled = [];
  const desk = {
    inputOf: (track) => (track.includes('/') ? { into: `in ${track}` } : null),
    control: (strip, controller) => controlled.push([strip, controller.controller]),
    isStripTrack: (track) => track === 'master',
  };
  return { desk, controlled };
}
// a factory on the test's desk, its parts as the test says: a tap's on 'my tap/n'; each instrument made recorded
function factoryOf() {
  const { desk, controlled } = deskOf();
  const made = [];
  const asked = [];
  const partOf = (key) => {
    asked.push(key);
    if (!key.startsWith('my tap/')) {
      return null;
    }
    return {
      role: 'tap',
      make: (into) => {
        const heard = [];
        made.push({ into, heard });
        return { receive: (messages) => heard.push(...messages.map(({ type }) => type)) };
      },
    };
  };
  return { factory: new InstrumentChannelFactory({ desk, partOf }), made, asked, controlled };
}
const noteOn = { type: 'note on', index: 0, pitch: 60, velocity: 1, t: 1 };
const volume = { type: 'controller', controller: 'volume', value: 0.5, t: 1 };

test("a channel for a track's key, made the first time it's asked for, then kept", () => {
  const { factory, asked } = factoryOf();
  const channel = factory.of('my tap/1');
  assert.equal(factory.of('my tap/1'), channel);
  assert.deepEqual(asked, ['my tap/1'], 'what is on it asked once');
});

test("what's on it: its role; its instrument made at its first note, plugged into its channel, hearing every message; its controllers its strip's", () => {
  const { factory, made, controlled } = factoryOf();
  const channel = factory.of('my tap/2');
  assert.equal(channel.role, 'tap');
  channel.receive([volume]);
  assert.deepEqual(made, [], 'no instrument before its first note');
  assert.deepEqual(controlled, [['my tap/2', 'volume']]);
  channel.receive([noteOn, volume]);
  assert.deepEqual(made, [{ into: 'in my tap/2', heard: ['note on', 'controller'] }]);
  assert.deepEqual(controlled.at(-1), ['my tap/2', 'volume']);
  channel.receive([noteOn]);
  assert.equal(made.length, 1, 'made once');
});

test("a strip of the desk's own: no instrument, its controllers the desk's; a key with neither refused", () => {
  const { factory, made, controlled } = factoryOf();
  const master = factory.of('master');
  assert.equal(master.role, 'strip');
  master.receive([noteOn, volume]);
  assert.deepEqual(made, []);
  assert.deepEqual(controlled, [['master', 'volume']]);
  assert.throws(() => factory.of('nobody'), /no track nobody/);
});

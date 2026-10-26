// The desk as it plays (libs/modular-audio/build/desk/mixing/mixing-desk.ts), on a stand-in for what's built (test/built.js) and the desk
// library's small studio (libs/modular-audio/plan/desk/test/desks.js):
//   - built from its plan by the function handed in, the settings changed before in it; a way into each of its own inputs;
//     the values set before told it;
//   - a track's channel, its pool's copy, added the first time it's asked for once built, what was set on it before told;
//   - a track's instrument's way into its channel, the channel added as its first note comes, once;
//   - a value set by its address, kept, told where it plays; a choice by its index kept as its choice; read back;
//   - settings changed as a preset; a new beat, one unchanged passed over; whether a strip is one of its own channels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MixingDesk } from '../index.ts';
import { deskOn } from './built.js';
import { planned } from '../../../../plan/desk/test/desks.js';
import { settingAt } from '../../../../plan/format/index.ts';

const PLAN = planned();
const ROOM = 'reverb/reverb/length';

test('built from its plan by the function handed in, the settings changed before in it; a way into each of its own inputs, by name; the values set before told it', () => {
  const { desk, built, handed, build } = deskOn(MixingDesk, PLAN);
  desk.settings({ [ROOM]: 2 });
  desk.set(['tap', 'volume'], 0.5);
  assert.equal(desk.built, null);
  assert.equal(build(), built);
  assert.equal(desk.built, built);
  assert.equal(settingAt(handed[0], ['reverb', 'reverb', 'room', 'length']).value, 2);
  assert.deepEqual(desk.bus, { sings: 'into sings', you: 'into you', tap: 'into tap' });
  assert.deepEqual(built.told, [['tap/volume', 0.5, {}]]);
});

test("a track's channel, its pool's copy, added the first time it's asked for once built, what was set on it before told; none for a track with no pool", () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  desk.set(['my tap', '3', 'volume'], 0.4);
  assert.deepEqual(desk.channelOf('my tap/3'), ['my tap', '3'], 'before it is built: its address alone');
  assert.equal(desk.added('my tap/3'), false);
  build();
  assert.deepEqual(desk.channelOf('my tap/3'), ['my tap', '3']);
  desk.channelOf('my tap/3');
  desk.channelOf('my tap/10');
  assert.deepEqual(built.added, ['my tap/3', 'my tap/10'], 'each once');
  assert.ok(built.told.some(([address, value]) => address === 'my tap/3/volume' && value === 0.4));
  assert.deepEqual(desk.copiesOf('my tap'), [
    ['my tap', '3'],
    ['my tap', '10'],
  ]);
  assert.ok(desk.wiring().children.length > PLAN.node.children.length, 'its copies among its channels');
  assert.equal(desk.channelOf('reverb'), null);
  assert.equal(desk.channelOf('nobody/1'), null);
});

test("a track's instrument's way into its channel, the channel added as its first note comes, once; none for a track with no pool", () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  build();
  assert.deepEqual(desk.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(desk.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(built.added, ['my tap/3']);
  assert.equal(desk.inputOf('reverb'), null);
});

test('a value set: kept, told what plays it; a choice by its index kept as its choice; read back as set, or as the plan starts it', () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  build();
  desk.set(['tap', 'volume'], 0.3, { glide: 0.05 });
  assert.deepEqual(built.told.at(-1), ['tap/volume', 0.3, { glide: 0.05 }]);
  assert.equal(desk.valueOf(['tap', 'volume']), 0.3);
  desk.set(['delay 1', 'delay', 'note'], 1);
  assert.equal(desk.valueOf(['delay 1', 'delay', 'note']), '1/16', 'its choice');
  desk.set(['my tap', '5', 'volume'], 0.2);
  assert.notEqual(built.told.at(-1)[0], 'my tap/5/volume', 'a copy not added: kept, not told');
  assert.equal(desk.valueOf(['my tap', '5', 'volume']), 0.2);
  assert.equal(desk.startOf(['tap', 'utility', 'level']), 0.7);
  assert.ok(desk.specOf(['tap', 'volume']));
  assert.equal(desk.specOf(['nowhere']), undefined);
});

test("settings changed: kept, what's built built again with them; a new beat told, one unchanged passed over; whether a strip is one of its own channels", () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  build();
  desk.settings({ [ROOM]: 1.5 });
  assert.deepEqual(built.presets, [[{}, { [ROOM]: 1.5 }]]);
  assert.equal(desk.valueOf(['reverb', 'reverb', 'length']), 1.5);
  desk.tempo(0.5);
  desk.tempo(0.5);
  desk.tempo(0.6);
  assert.deepEqual(built.tempi, [0.5, 0.6]);
  assert.deepEqual([desk.isOwn('tap'), desk.isOwn('my tap/3')], [true, false]);
});

// The desk as the view models read it (mockup/src/libs/view/models/desk-port.ts), a port for a desk as it plays, on the
// desk library's desk and its stand-in for what's built (libs/build/desk/test/built.js), the desk library's small studio:
//   - its plan; a value as it plays, its start; a strip's mute and solo the live mix's;
//   - how a param is set: a strip's own live, by its notes where they set it; an insert's as its slot's role says;
//     what a slot does there;
//   - a level and a reading once built, its channel there; 0 before;
//   - a pool's copies; what's done: a param played as a controller, a choice by its index; a setting, a rebuild.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskPort } from '../index.ts';
import { Desk } from '../../../build/desk/index.ts';
import { deskOn } from '../../../build/desk/test/built.js';
import { planned } from '../../../plan/desk/test/desks.js';

const PLAN = planned();
// the setup's rules: a replay tower live, a track's volume its notes'; the air a track's slot, set by distance, a
// Utility the desk's own, its level live
const SETUP = {
  isLive: (track) => track === 'replay tower/1',
  setByNotes: (address) => address.at(-1) === 'volume',
  roleOf: (strip, slot) => {
    if (slot === 'air' && strip.includes('/')) {
      return { job: 'the air', setBy: 'distance', by: 'automated', source: 'distance' };
    }
    return slot === 'utility' ? { job: 'its level', by: 'live', sets: ['level'] } : undefined;
  },
};

function portOn() {
  const on = deskOn(Desk, PLAN, { setup: SETUP });
  const moves = [];
  const port = deskPort({ desk: on.desk, setup: SETUP, control: (...move) => moves.push(move) });
  return { ...on, port, moves };
}
const switched = (name) => ({ type: 'controller', controller: name, value: 1, t: 0 });

test("the desk's plan; a value as it plays, its start; a strip's mute and solo the live mix's", () => {
  const { desk, port } = portOn();
  assert.equal(port.plan, PLAN);
  desk.set(['tap', 'volume'], 0.5);
  assert.equal(port.valueOf(['tap', 'volume']), 0.5);
  assert.equal(port.startOf(['tap', 'utility', 'level']), 0.7);
  desk.control('tap', switched('mute'));
  assert.deepEqual(
    [port.valueOf(['tap', 'mute']), port.valueOf(['tap', 'solo']), port.valueOf(['you', 'mute'])],
    [1, 0, 0],
  );
});

test("how a param is set: a strip's own live, on a live track or where its notes don't set it, by its notes where they do; an insert's as its slot's role says, fixed where it sets none of it; what a slot does there", () => {
  const { port } = portOn();
  assert.deepEqual(port.roleOf(['tap', 'volume']), { by: 'live' }, "the desk's own");
  assert.deepEqual(
    port.roleOf(['my tap', '3', 'volume']),
    { by: 'automated', recorded: true },
    'its notes, its lane recorded',
  );
  assert.deepEqual(port.roleOf(['replay tower', '1', 'volume']), { by: 'live' }, 'a live track');
  assert.deepEqual(port.roleOf(['my tap', '3', 'mute']), { by: 'live' }, 'its mute');
  assert.deepEqual(port.roleOf(['my tap', '3', 'air', 'cutoff']), {
    by: 'automated',
    source: 'distance',
    recorded: true,
  });
  assert.deepEqual(port.roleOf(['tap', 'utility', 'level']), { by: 'live' });
  assert.deepEqual(port.roleOf(['tap', 'utility', 'pan']), { by: 'fixed' }, 'one its slot sets none of');
  assert.deepEqual(port.slotOf(['my tap', '3', 'air', 'cutoff']), { job: 'the air', setBy: 'distance' });
  assert.equal(port.slotOf(['reverb', 'reverb', 'room']), undefined);
});

test("a level and a reading once the desk is built, its channel there, a copy's once added; 0 before", () => {
  const { desk, built, build, port } = portOn();
  assert.equal(port.peakOf(['tap']), 0, 'not built yet');
  build();
  built.levels.set('tap/', 0.4);
  built.levels.set('master/limiter/reduction', 3);
  built.levels.set('my tap/3/', 0.2);
  assert.deepEqual([port.peakOf(['tap']), port.readingOf(['master', 'limiter'], 'reduction')], [0.4, 3]);
  assert.equal(port.peakOf(['my tap', '3']), 0, 'a copy not added');
  desk.inputOf('my tap/3');
  assert.equal(port.peakOf(['my tap', '3']), 0.2);
});

test("a pool's copies added; what's done: a param played as a controller on its strip's track, a choice by its index; a setting, the desk built again with it", () => {
  const { desk, built, build, port, moves } = portOn();
  build();
  desk.inputOf('my tap/3');
  assert.deepEqual(port.copiesOf(['my tap']), [['my tap', '3']]);
  port.send({ type: 'param', address: ['my tap', '3', 'send', 'reverb'], value: 0.4 });
  port.send({ type: 'param', address: ['delay 1', 'delay', 'note'], value: '1/16' });
  assert.deepEqual(moves, [
    ['my tap/3', 'send/reverb', 0.4],
    ['delay 1', 'delay/note', 1],
  ]);
  port.send({ type: 'setting', address: ['reverb', 'reverb', 'length'], value: 2 });
  assert.deepEqual(built.presets, [[{}, { 'reverb/reverb/length': 2 }]]);
});

// The desk as the view models read it (mockup/src/libs/view/models/desk-port.ts), a port for a desk as it plays, on the
// desk library's desk and its stand-in for what's built (libs/build/desk/test/built.js), the desk library's small studio:
//   - its plan; a value as it plays, its start; a strip's mute and solo the live mix's;
//   - how a param is set, worked out: a strip's own live, by its notes where they set it; an insert's own params and
//     settings live on a live strip, by what sets it on a track; what a slot does there, its words where its plan has
//     them;
//   - a level and a reading once built, its channel there; 0 before;
//   - a pool's copies;
//   - what's done sent as the desk's message, a param's value or a setting, by its address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskEdited, deskPort } from '../index.ts';
import { Desk } from '../../../build/desk/index.ts';
import { deskOn } from '../../../build/desk/test/built.js';
import { planned } from '../../../plan/desk/test/desks.js';

const PLAN = planned();
// the setup's rules: a replay tower live; on a track, its volume set by its notes' dry level, its air's cutoff by
// distance
const SETS = { volume: 'dry', 'air/cutoff': 'distance' };
const SETUP = {
  isLive: (track) => track === 'replay tower/1',
  setBy: (address) => SETS[address.slice(-2).join('/')] ?? SETS[address.at(-1)],
};

function portOn() {
  const on = deskOn(Desk, PLAN, { setup: SETUP });
  const port = deskPort({ desk: on.desk, setup: SETUP });
  return { ...on, port };
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

test("how a param is set, worked out: a strip's own live, on a live track or where its notes don't set it, by its notes where they do; an insert's own params and settings live on a live strip, deeper ones fixed; on a track by what sets it, else fixed; what a slot does there, its words where its plan has them, else on its strip", () => {
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
  assert.deepEqual(port.roleOf(['my tap', '3', 'air', 'q']), { by: 'fixed' }, 'nothing sets it');
  assert.deepEqual(
    ['level', 'pan', 'pan/law'].map((param) => port.roleOf(['tap', 'utility', ...param.split('/')])),
    [{ by: 'live' }, { by: 'live' }, { by: 'fixed' }],
    "the desk's own Utility: its macros live, a setting within fixed",
  );
  assert.deepEqual(port.roleOf(['reverb', 'reverb', 'length']), { by: 'live' }, "a Reverb's own setting");
  assert.deepEqual(port.slotOf(['my tap', '3', 'air', 'cutoff']), { job: 'the air', setBy: 'distance' });
  assert.deepEqual(port.slotOf(['tap', 'utility']), { job: 'on tap' });
  assert.equal(port.slotOf(['tap', 'nowhere']), undefined);
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

test("a pool's copies added", () => {
  const { desk, build, port } = portOn();
  build();
  desk.inputOf('my tap/3');
  assert.deepEqual(port.copiesOf(['my tap']), [['my tap', '3']]);
});

test("what's done sent as the desk's message: a param's value, a setting, by its address", () => {
  const address = ['delay 1', 'delay', 'note'];
  assert.deepEqual(deskEdited({ type: 'param', address, value: '1/16' }), {
    type: 'desk edited',
    of: 'values',
    address,
    value: '1/16',
  });
  assert.deepEqual(deskEdited({ type: 'setting', address, value: 2 }).of, 'settings');
});

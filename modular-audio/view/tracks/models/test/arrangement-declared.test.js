// modular-audio/view/tracks/models/arrangement/declared.ts: what the desk declares, as the arrangement
// asks it: a lane's param by its strip and controller, and a strip's controllers in signal order
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { declaredBy } from '../index.ts';
import { DeskViewBuilder } from '../../../desk/models/index.ts';
import { studioReadout } from '../../../desk/models/test/desk.js';

// the desk's view models on a plan's readout of the tests' own, every value at its plan's
function viewsOf() {
  return new DeskViewBuilder(studioReadout(), () => {});
}

test("a strip's controllers in the order the sound goes through it, as its view model has them: its inserts' controls, its sends, its volume, pan, mute and solo; a pool's copy's too; none for a strip not on the desk", () => {
  const declared = declaredBy(viewsOf());
  assert.deepEqual(declared.controllersOf('tap'), [
    'utility/level',
    'utility/pan',
    'utility/pan/law',
    'send/reverb',
    'send/delay 1',
    'volume',
    'pan',
    'mute',
    'solo',
  ]);
  assert.deepEqual(declared.controllersOf('my tap/2'), [
    'air/cutoff',
    'air/q',
    'air/filter/type',
    'air/filter/slope',
    'utility/level',
    'utility/pan',
    'utility/pan/law',
    'send/reverb',
    'send/delay 1',
    'volume',
    'mute',
    'solo',
  ]);
  assert.deepEqual(declared.controllersOf('master'), ['limiter/gain', 'limiter/ceiling', 'limiter/release', 'volume']);
  assert.deepEqual(declared.controllersOf('nowhere'), []);
});

test("a lane's param as the desk declares it, by its strip and its controller there; none where nothing does", () => {
  const declared = declaredBy(viewsOf());
  assert.equal(declared.specOf('tap', 'utility/level')?.name, 'level');
  assert.equal(declared.specOf('my tap/2', 'send/reverb')?.name, 'reverb');
  assert.equal(declared.specOf('tap', 'nowhere'), undefined);
});

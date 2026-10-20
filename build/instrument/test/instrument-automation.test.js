// The instrument's automation (libs/build/instrument/instrument-automation.ts), on a stand-in bank
// and a clock of the test's own: a patch's value set at its time as the bank's edit, by its patch and
// its address; one already due set at once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentAutomation } from '../index.ts';

function automationOn() {
  const edits = [];
  const ticks = [];
  const clock = { time: 0, now: () => clock.time, onTick: (listener) => ticks.push(listener) };
  const bank = { edit: (message) => edits.push(message) };
  const tick = (now) => {
    clock.time = now;
    ticks.forEach((listener) => listener(now));
  };
  const specOf = (patch, address) =>
    address.join('/') === 'lfo/note' ? { name: 'note', choices: ['1/4', '1/8'] } : undefined;
  return { automation: new InstrumentAutomation({ bank, clock, specOf }), edits, tick };
}
const controller = (name, value, t, glide) => ({
  type: 'controller',
  controller: name,
  value,
  t,
  ...(glide && { glide }),
});

test("a patch's value set at its time as the bank's edit, by its patch and its address; one already due set at once", () => {
  const { automation, edits, tick } = automationOn();
  automation.control('reed', controller('voice/cutoff', 900, 2, 0.05));
  assert.deepEqual(edits, [], 'held until its time');
  tick(1.9);
  assert.deepEqual(edits, []);
  tick(2);
  assert.deepEqual(edits, [
    { type: 'preset edited', patch: 'reed', of: 'values', address: ['voice', 'cutoff'], value: 900 },
  ]);
  automation.control('pad', controller('level', 0.5, 1));
  assert.equal(edits.length, 2, 'one already due set at once');
  assert.deepEqual(edits[1], { type: 'preset edited', patch: 'pad', of: 'values', address: ['level'], value: 0.5 });
});

test("a param with choices set as its choice, the controller's value its index", () => {
  const { automation, edits, tick } = automationOn();
  automation.control('reed', controller('lfo/note', 1, 2));
  tick(2);
  assert.deepEqual(edits, [
    { type: 'preset edited', patch: 'reed', of: 'values', address: ['lfo', 'note'], value: '1/8' },
  ]);
});

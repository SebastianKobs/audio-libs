// A time with a sync switch (mockup/src/libs/params/time.ts), as Ableton's: synced, a note value;
// free, in ms or Hz; declared as three params side by side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSwitch, NOTE_VALUES, timeParamsIn, timeSpecs } from '../index.ts';

test('the note values a synced time steps through: shortest first, a 16th triplet to a dotted half', () => {
  assert.deepEqual(NOTE_VALUES, [
    '1/16t',
    '1/16',
    '1/8t',
    '1/16.',
    '1/8',
    '1/4t',
    '1/8.',
    '1/4',
    '1/2t',
    '1/4.',
    '1/2',
    '1/2.',
  ]);
});

test("a length's three params: a sync switch, the note values, its free time in ms by octaves; each where it starts", () => {
  const specs = timeSpecs({ unit: 'ms', range: [1, 4000, 1], start: { sync: true, note: '1/8', free: 417 } });
  assert.deepEqual(Object.keys(specs), ['sync', 'note', 'ms']);
  assert.ok(isSwitch(specs.sync), 'sync a switch');
  assert.equal(specs.sync.default, 1, 'on');
  assert.deepEqual(specs.note.choices, NOTE_VALUES);
  assert.equal(specs.note.default, '1/8');
  assert.deepEqual(specs.ms, { name: 'ms', unit: 'ms', range: [1, 4000, 1], default: 417, taper: 'octaves' });
});

test("a rate's free value in Hz, named hz; a time starting free has its switch off", () => {
  const specs = timeSpecs({ unit: 'Hz', range: [0.01, 20, 0.01], start: { sync: false, note: '1/4', free: 5 } });
  assert.deepEqual(Object.keys(specs), ['sync', 'note', 'hz']);
  assert.equal(specs.sync.default, 0, 'off');
  assert.equal(specs.hz.unit, 'Hz');
});

test("a time's three params among a part's keys, as a device declares them: its sync switch, its note and its free one, ms, hz or an oscillator's frequency; none without all three", () => {
  assert.deepEqual(timeParamsIn(['sync', 'note', 'ms', 'feedback', 'tone']), {
    sync: 'sync',
    note: 'note',
    free: 'ms',
  });
  assert.deepEqual(timeParamsIn(['rate', 'hz', 'note', 'sync']), { sync: 'sync', note: 'note', free: 'hz' });
  assert.deepEqual(timeParamsIn(['sync', 'note', 'frequency', 'detune']), {
    sync: 'sync',
    note: 'note',
    free: 'frequency',
  });
  assert.equal(timeParamsIn(['note', 'ms', 'feedback']), undefined, 'no switch');
  assert.equal(timeParamsIn(['sync', 'ms']), undefined, 'no note');
  assert.equal(timeParamsIn(['sync', 'note']), undefined, 'no free one');
});

// The instrument's control surface (libs/build/instrument/instrument-surface.ts), on a stand-in bank, a clock and an
// input of the test's own: a patch's value moved by hand:
//   - played in as a controller on the patch's track, now, gliding, told to whoever listens; a choice by its index,
//     at once;
//   - a setting and a reset the bank's edits, nothing played in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentSurface } from '../index.ts';
import { SMOOTHING } from '../../../automation/index.ts';

const CHOICE = { name: 'note', choices: ['1/4', '1/8', '1/16'] };
const KNOB = { name: 'cutoff', range: [0, 1, 0.01] };

function surfaceOn() {
  const edits = [];
  const sent = [];
  const clock = { now: () => 3 };
  const bank = { edit: (message) => edits.push(message) };
  const input = { send: (to, messages) => sent.push([to, messages]) };
  const specOf = (patch, address) => (address.join('/') === 'lfo/note' ? CHOICE : KNOB);
  const track = (patch) => `instrument ${patch}`;
  return { surface: new InstrumentSurface({ bank, clock, input, track, specOf }), edits, sent };
}
const edit = (of, address, value) => ({ type: 'preset edited', patch: 'reed', of, address, value });

test("a value played in as a controller on its patch's track, now, gliding, told", () => {
  const { surface, sent, edits } = surfaceOn();
  const told = [];
  surface.onControl((track, controller) => told.push([track, controller]));
  surface.edit(edit('values', ['voice', 'cutoff'], 0.5));
  assert.deepEqual(sent, [
    [
      { track: 'instrument reed', play: undefined },
      [{ type: 'controller', controller: 'voice/cutoff', value: 0.5, t: 3, glide: SMOOTHING }],
    ],
  ]);
  assert.deepEqual(told, [['instrument reed', 'voice/cutoff']]);
  assert.deepEqual(edits, [], 'set when it plays back, not now');
});

test('a choice played in as its index, at once, no glide', () => {
  const { surface, sent } = surfaceOn();
  surface.edit(edit('values', ['lfo', 'note'], '1/8'));
  assert.deepEqual(sent[0][1], [{ type: 'controller', controller: 'lfo/note', value: 1, t: 3 }]);
});

test('a setting and a reset the bank edits at once, nothing played in', () => {
  const { surface, sent, edits } = surfaceOn();
  surface.edit(edit('settings', ['filter', 'type'], 'highpass'));
  surface.edit({ type: 'preset reset', patch: 'reed' });
  assert.deepEqual(edits, [edit('settings', ['filter', 'type'], 'highpass'), { type: 'preset reset', patch: 'reed' }]);
  assert.deepEqual(sent, []);
});

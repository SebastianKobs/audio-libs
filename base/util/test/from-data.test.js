// Data read from a file, its shape checked (mockup/src/libs/base/util/from-data.ts): handed back as it is where it has the shape,
// else refused, every problem said where it is, under the file's name and what it should have been
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromData } from '../index.ts';

// a desk, written short, as a shape: a word, one of some words, a list of items, an item's needs, a map, a number, a switch
const INSERT = { fields: { name: 'word' }, needs: ['name', ['kind', 'preset']] };
const TAP = { oneOf: ['pre', 'post'] };
const CHANNEL = {
  fields: {
    name: 'word',
    role: { oneOf: ['channel', 'bus', 'return'] },
    inserts: { listOf: INSERT },
    pan: 'switch',
    volume: 'number',
    taps: { byName: TAP },
  },
  needs: ['name', 'role'],
};
const DESK = { fields: { kind: 'word', channels: { listOf: CHANNEL } }, needs: ['kind', 'channels'] };
// presets by name, each its kind and its values by address
const PRESETS = { byName: { fields: { kind: 'word', values: { byName: 'word or number' } }, needs: ['kind'] } };

// the lines a refusal says, under its heading
function refusal(read) {
  try {
    read();
  } catch (error) {
    return error.message.split('\n  ');
  }
  return undefined;
}

test('data of the shape handed back as it is; what the shape says nothing of left as it is', () => {
  const desk = {
    kind: 'Studio',
    channels: [
      { name: 'reverb', role: 'return', inserts: [{ name: 'room', kind: 'Reverb' }], pan: true, volume: 0.6 },
      { name: 'you', role: 'bus', taps: { reverb: 'pre' }, out: 'master', anything: [1, 2] },
    ],
  };
  assert.equal(fromData(desk, DESK, { source: 'desk.yaml', what: 'a desk' }), desk);
  const presets = { delay: { kind: 'Delay', values: { 'line/note': '1/8', feedback: 0.45 } } };
  assert.equal(fromData(presets, PRESETS, { source: 'effects.yaml', what: 'presets' }), presets);
});

test("data not of the shape refused, every problem said where it is, under the file's name and what it should have been", () => {
  const bent = {
    kind: 3,
    channels: [
      { name: 'reverb', role: 'send', inserts: [{ name: 'room' }, 'room'], pan: 'yes', volume: 'loud' },
      { role: 'bus', taps: { reverb: 'late' } },
      'you',
    ],
  };
  assert.deepEqual(
    refusal(() => fromData(bent, DESK, { source: 'desk.yaml', what: 'a desk' })),
    [
      'desk.yaml: not of the shape of a desk:',
      'its kind not a word',
      'channels 1: its role send, not channel, bus or return',
      'channels 1 inserts 1: no kind or preset',
      'channels 1 inserts 2: not an object',
      'channels 1: its pan not true or false',
      'channels 1: its volume not a number',
      'channels 2: no name',
      'channels 2: its taps reverb late, not pre or post',
      'channels 3: not an object',
    ],
  );
  assert.deepEqual(
    refusal(() => fromData({ kind: 'Empty', channels: {} }, DESK, { source: 'e.yaml', what: 'a desk' })),
    ['e.yaml: not of the shape of a desk:', 'its channels not a list'],
  );
  assert.deepEqual(
    refusal(() => fromData({}, DESK, { source: 'e.yaml', what: 'a desk' })),
    ['e.yaml: not of the shape of a desk:', 'no kind', 'no channels'],
  );
});

test('data not an object where an object is asked for: none, or a value of its type; a map by name, each entry said by its name', () => {
  assert.deepEqual(
    refusal(() => fromData(null, DESK, { source: 'n.yaml', what: 'a desk' })),
    ['n.yaml: not of the shape of a desk:', 'not an object: none'],
  );
  assert.deepEqual(
    refusal(() => fromData('Studio', PRESETS, { source: 's.yaml', what: 'presets' })),
    ['s.yaml: not of the shape of presets:', 'not an object: a string'],
  );
  const bent = { delay: { values: { feedback: [0.4] } }, room: 'Reverb', echo: { kind: 'Delay', values: [] } };
  assert.deepEqual(
    refusal(() => fromData(bent, PRESETS, { source: 'effects.yaml', what: 'presets' })),
    [
      'effects.yaml: not of the shape of presets:',
      'delay: no kind',
      'delay: its values feedback not a word or a number',
      'room: not an object',
      'echo: its values not an object',
    ],
  );
});

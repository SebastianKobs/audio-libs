// The blocks' unit tests (mockup/src/libs/plan/blocks): the contract every builder meets.
//   - the nine blocks, each declared by its kind;
//   - each param and setting on a control, its default where it has one inside it, its name one of a kind;
//   - each block's inputs and outputs, their channels where the block fixes them;
//   - what each declares: its names in short standard terms, its settings' choices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS } from '../index.ts';
import { isSwitch, NOTE_VALUES } from '../../../params/index.ts';

const KINDS = ['oscillator', 'gain', 'filter', 'pan', 'delay', 'reverb', 'noise', 'limiter', 'envelope'];
const MONO = 1;
const STEREO = 2;

// what each block declares, by name: its params, its settings, its inputs and outputs, a channel count where it's fixed
function declared({ params, settings, inputs, outputs }) {
  const jack = ({ name, channels }) => (channels === undefined ? name : `${name} ${channels}`);
  return {
    params: params.map((spec) => spec.name),
    settings: settings.map((spec) => spec.name),
    inputs: inputs.map(jack),
    outputs: outputs.map(jack),
  };
}
// whether a value is one its spec's control can take: within its range, or one of its choices
function onControl({ range, choices }, value) {
  if (choices) {
    return choices.includes(value);
  }
  return value >= range[0] && value <= range[1];
}

test('the nine blocks, each declared by its kind, the contract every builder meets', () => {
  assert.deepEqual(Object.keys(BLOCKS), KINDS);
  for (const [kind, block] of Object.entries(BLOCKS)) {
    assert.equal(block.kind, kind);
  }
});

test("every block's params and settings on a control, a range or choices, a default declared inside it; their names one of a kind, an input's and an output's too", () => {
  for (const block of Object.values(BLOCKS)) {
    const specs = [...block.params, ...block.settings];
    for (const spec of specs) {
      assert.ok(spec.range || spec.choices, `${block.kind}/${spec.name}: a range or choices`);
      if (spec.default !== undefined) {
        assert.ok(onControl(spec, spec.default), `${block.kind}/${spec.name}: its default on it`);
      }
    }
    for (const names of [
      specs.map((spec) => spec.name),
      block.inputs.map((jack) => jack.name),
      block.outputs.map((jack) => jack.name),
    ]) {
      assert.equal(new Set(names).size, names.length, `${block.kind}: ${names.join(', ')}`);
    }
  }
});

test('what each block declares, in short standard terms: its params, its settings, its inputs and outputs, mono or stereo where it fixes them', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(BLOCKS).map(([kind, block]) => [kind, declared(block)])), {
    oscillator: { params: ['frequency', 'detune'], settings: ['wave'], inputs: [], outputs: [`out ${MONO}`] },
    gain: { params: ['gain'], settings: [], inputs: ['in'], outputs: ['out'] },
    filter: { params: ['frequency', 'resonance'], settings: ['type'], inputs: ['in'], outputs: ['out'] },
    pan: { params: ['pan'], settings: ['law'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    delay: { params: ['sync', 'note', 'ms'], settings: ['longest'], inputs: ['in'], outputs: ['out'] },
    reverb: { params: [], settings: ['length'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    noise: { params: [], settings: ['colour'], inputs: [], outputs: [`out ${MONO}`] },
    limiter: { params: ['gain', 'ceiling', 'release'], settings: [], inputs: ['in'], outputs: ['out'] },
    envelope: {
      params: ['gate', 'delay', 'attack', 'hold', 'decay', 'sustain', 'release', 'amount'],
      settings: [],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
  });
});

test("the blocks' choices: an oscillator's waves, a filter's three types, a pan's laws, a noise's colours; a delay's time with a sync switch, synced to the note values; an envelope's gate a switch", () => {
  const setting = (kind, name) => BLOCKS[kind].settings.find((spec) => spec.name === name);
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  assert.deepEqual(setting('oscillator', 'wave').choices, ['sine', 'triangle', 'square', 'sawtooth']);
  assert.deepEqual(setting('filter', 'type').choices, ['lowpass', 'highpass', 'bandpass']);
  assert.deepEqual(setting('pan', 'law').choices, ['stereo', 'pan pot']);
  assert.deepEqual(setting('noise', 'colour').choices, ['noise', 'breath']);
  assert.ok(isSwitch(param('delay', 'sync')));
  assert.deepEqual(param('delay', 'note').choices, NOTE_VALUES);
  assert.equal(param('delay', 'ms').unit, 'ms');
  assert.ok(isSwitch(param('envelope', 'gate')), 'opened and closed by the note');
  assert.equal(param('filter', 'frequency').taper, 'octaves');
});

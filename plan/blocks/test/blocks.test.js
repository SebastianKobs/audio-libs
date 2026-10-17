// The blocks' unit tests (mockup/src/libs/plan/blocks): the contract every builder meets.
//   - the ten blocks, each declared by its kind;
//   - each param and setting on a control, its default where it has one inside it, its name one of a kind;
//   - each block's inputs and outputs, their channels where the block fixes them;
//   - what each declares: its names in short standard terms, its settings' choices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, biquadQs } from '../index.ts';
import { near } from '../../../util/test/near.js';
import { dBOf, FADER_GAIN, isSwitch, NOTE_VALUES, timeParamsIn } from '../../../params/index.ts';

const KINDS = ['oscillator', 'gain', 'filter', 'pan', 'delay', 'reverb', 'noise', 'limiter', 'envelope', 'select'];
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
// whether a value is one its spec's control can take: within its range, a gain's in dB, or one of its choices
function onControl({ range, choices, dB }, value) {
  if (choices) {
    return choices.includes(value);
  }
  const shown = dB ? dBOf(value) : value;
  return shown >= range[0] && shown <= range[1];
}

test('the ten blocks, each declared by its kind, the contract every builder meets', () => {
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
    oscillator: {
      params: ['sync', 'note', 'frequency', 'detune', 'stop'],
      settings: ['wave', 'phase'],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    gain: { params: ['gain'], settings: [], inputs: ['in'], outputs: ['out'] },
    filter: {
      params: ['frequency', 'resonance', 'detune'],
      settings: ['type', 'slope'],
      inputs: ['in'],
      outputs: ['out'],
    },
    pan: { params: ['pan'], settings: ['law'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    delay: { params: ['sync', 'note', 'ms'], settings: ['longest'], inputs: ['in'], outputs: ['out'] },
    reverb: { params: [], settings: ['length'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    noise: { params: ['offset', 'stop'], settings: ['colour', 'loop'], inputs: [], outputs: [`out ${MONO}`] },
    limiter: { params: ['gain', 'ceiling', 'release'], settings: [], inputs: ['in'], outputs: ['out'] },
    envelope: {
      params: ['gate', 'delay', 'attack', 'hold', 'decay', 'sustain', 'release', 'amount'],
      settings: ['mode'],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    select: { params: [], settings: ['input'], inputs: ['a', 'b'], outputs: ['out'] },
  });
});

test("the blocks' choices: an oscillator's waves, a filter's three types, a pan's laws, a noise's colours, a select's inputs; a delay's time with a sync switch, synced to the note values; an envelope's gate a switch; a filter's frequency and resonance by octaves; a gain the fader's", () => {
  const setting = (kind, name) => BLOCKS[kind].settings.find((spec) => spec.name === name);
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  assert.deepEqual(setting('oscillator', 'wave').choices, ['sine', 'triangle', 'square', 'sawtooth']);
  assert.deepEqual(setting('filter', 'type').choices, ['lowpass', 'highpass', 'bandpass']);
  assert.deepEqual([setting('filter', 'slope').choices, setting('filter', 'slope').default], [['12', '24'], '12']);
  assert.deepEqual(setting('pan', 'law').choices, ['stereo', 'pan pot']);
  assert.deepEqual(setting('noise', 'colour').choices, ['noise', 'breath']);
  assert.deepEqual(
    [setting('select', 'input').choices, setting('select', 'input').default],
    [['a', 'b'], 'a'],
    'the input it passes on, by its name',
  );
  assert.ok(isSwitch(param('delay', 'sync')));
  assert.deepEqual(param('delay', 'note').choices, NOTE_VALUES);
  assert.equal(param('delay', 'ms').unit, 'ms');
  assert.ok(isSwitch(param('envelope', 'gate')), 'opened and closed by the note');
  assert.deepEqual([param('filter', 'frequency').taper, param('filter', 'resonance').taper], ['octaves', 'octaves']);
  assert.deepEqual(param('gain', 'gain'), { ...FADER_GAIN, unit: 'dB', default: 1 }, "a gain the fader's, in dB, at 1");
});

test("a voice's blocks: an oscillator's rate a time with a sync switch, free its frequency in Hz, down to an LFO's, its phase reset with each note or running free; a source's stop, at 0 none, to play until it's let go; a noise looped or not, its offset into its buffer; an oscillator's detune and a filter's wide enough for a tune of four octaves; an envelope's curve an ARP's, no setting, its mode the gate's or a trigger's, running on past the note-off", () => {
  const setting = (kind, name) => BLOCKS[kind].settings.find((spec) => spec.name === name);
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  assert.ok(isSwitch(param('oscillator', 'sync')));
  assert.deepEqual(param('oscillator', 'note').choices, NOTE_VALUES);
  assert.deepEqual(
    [param('oscillator', 'frequency').unit, param('oscillator', 'sync').default],
    ['Hz', 0],
    'free to start, as every oscillator and LFO today',
  );
  assert.ok(
    param('oscillator', 'frequency').range[0] <= 0.025,
    "the slowest LFO today's, a quarter of a hertz's tenth",
  );
  assert.deepEqual(timeParamsIn(BLOCKS.oscillator.params.map(({ name }) => name)), {
    sync: 'sync',
    note: 'note',
    free: 'frequency',
  });
  assert.deepEqual(
    [setting('oscillator', 'phase').choices, setting('oscillator', 'phase').default],
    [['reset', 'free'], 'reset'],
  );
  for (const kind of ['oscillator', 'noise']) {
    assert.deepEqual(
      [param(kind, 'stop').unit, param(kind, 'stop').default],
      ['s', 0],
      `${kind}: none, at 0, to start`,
    );
  }
  assert.deepEqual([setting('noise', 'loop').choices, setting('noise', 'loop').default], [['off', 'on'], 'off']);
  assert.deepEqual([param('noise', 'offset').unit, param('noise', 'offset').default], ['s', 0]);
  for (const kind of ['oscillator', 'filter']) {
    const [low, high] = param(kind, 'detune').range;
    assert.ok(low <= -4800 && high >= 4800, `${kind}: four octaves either way, ${low}..${high}`);
    assert.deepEqual([param(kind, 'detune').unit, param(kind, 'detune').default], ['cents', 0]);
  }
  assert.deepEqual(
    [setting('envelope', 'mode').choices, setting('envelope', 'mode').default],
    [['gate', 'trigger'], 'gate'],
  );
  assert.ok(param('envelope', 'release').default > 0, 'a release to start, a trigger running on past the note-off');
});

test("a filter's stages, for a builder that builds it from biquads: at 12 dB one, at its resonance, Web Audio's own where none; at 24 two in series, a lowpass's or a highpass's a 4th-order Butterworth's at 0.707, its second moved by the resonance; a bandpass's both at it", () => {
  assert.deepEqual(biquadQs({ type: 'lowpass', resonance: 2, slope: '12' }), [2]);
  assert.deepEqual(biquadQs({ type: 'lowpass', slope: '12' }), [undefined]);
  const [low, high] = biquadQs({ type: 'lowpass', resonance: Math.SQRT1_2, slope: '24' });
  near(low, 0.5412, 'flat: the first', 1e-4);
  near(high, 1.3066, 'flat: the second', 1e-4);
  near(biquadQs({ type: 'highpass', slope: '24' })[1], 1.3066, 'flat where none is given', 1e-4);
  near(
    biquadQs({ type: 'lowpass', resonance: Math.SQRT2, slope: '24' })[1],
    2.6131,
    'twice the resonance: its second twice',
    1e-4,
  );
  assert.deepEqual(biquadQs({ type: 'bandpass', resonance: 3, slope: '24' }), [3, 3]);
});

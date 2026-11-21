// The blocks' unit tests (modular-audio/plan/blocks): the contract every builder meets.
//   - the twenty-seven blocks, each declared by its kind;
//   - each param and setting on a control, its default where it has one inside it, its name one of a kind;
//   - each block's inputs and outputs, their channels where the block fixes them;
//   - what each declares: its names in short standard terms, its choices, units and defaults;
//   - the rules it keeps apart: a switch, a taper, the fader's gain, a tune's reach, a free start, a release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import {
  BLOCKS,
  biquadQs,
  CRUSHER_SPECS,
  GRAINS_MEMORY,
  GRAINS_SPECS,
  EQ_BAND_SPECS,
  OVERSAMPLE,
  SATURATING_FILTER_SPECS,
  SHAPER_SPECS,
} from '../index.ts';
import { near } from '../../../../base/util/test/near.js';
import { onControl } from '../../../../base/params/test/on-control.js';
import { FADER_GAIN, isSwitch, NOTE_VALUES, timeParamsIn } from '../../../../base/params/index.ts';

const KINDS = [
  'oscillator',
  'gain',
  'filter',
  'pan',
  'delay',
  'reverb',
  'noise',
  'limiter',
  'lookahead limiter',
  'envelope',
  'select',
  'saturation',
  'one pole',
  'tilt',
  'shaper lag',
  'sync oscillator',
  'operators',
  'phase distortion',
  'crusher',
  'grains',
  'saturating filter',
  'germanium stage',
  'shaper',
  'eq band',
  'compressor',
  'wow',
  'room',
];
const WAVES = 'W1|W2|W3|W4|W5|W6|W7|W8';
const MONO = 1;
const STEREO = 2;

// a param's or a setting's name, then its unit, its choices and its default where it has them
function specText({ name, unit, choices, default: start }) {
  const words = [name];
  if (unit) {
    words.push(unit);
  }
  if (choices) {
    words.push(isDeepStrictEqual(choices, NOTE_VALUES) ? 'NOTE_VALUES' : choices.join('|'));
  }
  if (start !== undefined) {
    words.push(`=${start}`);
  }
  return words.join(' ');
}

// what each block declares: its params and settings as text, its inputs and outputs by name, a channel count where it's fixed
function declared({ params, settings, inputs, outputs }) {
  const jack = ({ name, channels }) => (channels === undefined ? name : `${name} ${channels}`);
  return {
    params: params.map(specText),
    settings: settings.map(specText),
    inputs: inputs.map(jack),
    outputs: outputs.map(jack),
  };
}

test('the twenty-seven blocks, each declared by its kind, the contract every builder meets', () => {
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

test("what each block declares, in short standard terms: its params and settings with their units, choices and defaults, its inputs and outputs, mono or stereo where it fixes them; the rules beside its table: switches, a time with a sync switch, rates by octaves, the fader's gain, an LFO's floor, a tune of four octaves, a free start, a release to start", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(BLOCKS).map(([kind, block]) => [kind, declared(block)])), {
    oscillator: {
      params: ['sync =0', 'note NOTE_VALUES =1/4', 'frequency Hz =440', 'detune cents =0', 'stop s =0'],
      settings: ['wave sine|triangle|square|sawtooth =sine', 'phase reset|free =reset'],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    gain: { params: ['gain dB =1'], settings: [], inputs: ['in'], outputs: ['out'] },
    filter: {
      params: ['frequency Hz =24000', 'resonance =0.707', 'detune cents =0'],
      settings: ['type lowpass|highpass|bandpass =lowpass', 'slope dB/oct 12|24 =12'],
      inputs: ['in'],
      outputs: ['out'],
    },
    pan: { params: ['pan =0'], settings: ['law stereo|pan pot =stereo'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    delay: {
      params: ['sync =1', 'note NOTE_VALUES =1/8', 'ms ms =417'],
      settings: ['longest s =4'],
      inputs: ['in'],
      outputs: ['out'],
    },
    reverb: { params: [], settings: ['length s =3.5'], inputs: ['in'], outputs: [`out ${STEREO}`] },
    noise: {
      params: ['offset s =0', 'stop s =0'],
      settings: ['color noise|breath =noise', 'loop off|on =off'],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    limiter: { params: ['gain dB', 'ceiling dBFS', 'release s'], settings: [], inputs: ['in'], outputs: ['out'] },
    'lookahead limiter': {
      params: ['gain dB =0', 'ceiling dBTP =-1', 'release s =0.1', 'clip dB =3'],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    envelope: {
      params: [
        'gate =0',
        'delay s =0',
        'attack s =0',
        'hold s =0',
        'decay s =0',
        'sustain =1',
        'release s =0.1',
        'amount =1',
      ],
      settings: ['mode gate|trigger =gate'],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    select: { params: [], settings: ['input a|b =a'], inputs: ['a', 'b'], outputs: ['out'] },
    saturation: {
      params: [
        'drive =1',
        'punish =0',
        'style smooth|console|germanium|triode|pentode =smooth',
        'auto =1',
        'oversample none|2x|4x =4x',
      ],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    'one pole': { params: ['frequency Hz =24000'], settings: [], inputs: ['in'], outputs: ['out'] },
    tilt: { params: ['tilt =1', 'frequency Hz =800'], settings: [], inputs: ['in'], outputs: ['out'] },
    'shaper lag': { params: ['oversample none|2x|4x =4x'], settings: [], inputs: ['in'], outputs: ['out'] },
    'sync oscillator': {
      params: [
        'frequency Hz =440',
        'detune cents =0',
        'sync semitones =0',
        'wave sawtooth|square =sawtooth',
        'stop s =0',
      ],
      settings: [],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    operators: {
      params: [
        'frequency Hz =440',
        'detune cents =0',
        'feedback =0',
        ...[1, 2, 3, 4].flatMap((n) => [
          `ratio${n} =1`,
          `detune${n} cents =0`,
          `level${n} =${n === 1 ? 1 : 0}`,
          `wave${n} ${WAVES} =W1`,
        ]),
        'algorithm =1',
        'phase reset|free =reset',
        'stop s =0',
      ],
      settings: [],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    'phase distortion': {
      params: [
        'frequency Hz =440',
        'detune cents =0',
        'dcw =0',
        'wave saw|square =saw',
        'phase reset|free =reset',
        'stop s =0',
      ],
      settings: [],
      inputs: [],
      outputs: [`out ${MONO}`],
    },
    crusher: { params: ['bits =16', 'rate Hz =48000'], settings: [], inputs: ['in'], outputs: ['out'] },
    'germanium stage': {
      params: ['drive dB =-10', 'level dB =-20', 'voicing treble booster|full range =treble booster'],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    grains: {
      params: [
        'freeze =0',
        'position s =0.25',
        'size s =0.08',
        'density Hz =12',
        'pitch semitones =0',
        'spray s =0.02',
      ],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    'saturating filter': {
      params: [
        'frequency Hz =24000',
        'detune cents =0',
        'resonance =0',
        'drive =1',
        'compensation =0',
        'mode ladder|lowpass|bandpass|highpass =ladder',
      ],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    shaper: {
      params: ['drive =1', 'shape =0', 'oversample none|2x|4x =2x'],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    'eq band': {
      params: ['type highpass|low shelf|peak|high shelf =peak', 'frequency Hz =1000', 'gain =1', 'resonance =0.707'],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    compressor: {
      params: ['threshold dBFS =-18', 'knee dB =6', 'ratio =2', 'attack s =0.02', 'release s =0.2'],
      settings: [],
      inputs: ['in'],
      outputs: ['out'],
    },
    wow: { params: ['frequency Hz =1'], settings: [], inputs: [], outputs: [`out ${MONO}`] },
    room: {
      params: ['decay s =1', 'pre delay s =0.02', 'taps =8', 'dense s =0.08', 'low decay =1', 'high decay =0.5'],
      settings: [],
      inputs: ['in'],
      outputs: [`out ${STEREO}`],
    },
  });
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  for (const [kind, name] of [
    ['delay', 'sync'],
    ['oscillator', 'sync'],
    ['envelope', 'gate'],
  ]) {
    assert.ok(isSwitch(param(kind, name)), `${kind}/${name}: a switch`);
  }
  assert.deepEqual(timeParamsIn(BLOCKS.oscillator.params.map(({ name }) => name)), {
    sync: 'sync',
    note: 'note',
    free: 'frequency',
  });
  assert.deepEqual([param('filter', 'frequency').taper, param('filter', 'resonance').taper], ['octaves', 'octaves']);
  assert.deepEqual(param('gain', 'gain'), { ...FADER_GAIN, unit: 'dB', default: 1 }, "a gain the fader's, in dB, at 1");
  assert.ok(param('oscillator', 'frequency').range[0] <= 0.025, "the slowest LFO's, a quarter of a hertz's tenth");
  for (const kind of ['oscillator', 'filter']) {
    const [low, high] = param(kind, 'detune').range;
    assert.ok(low <= -4800 && high >= 4800, `${kind}: four octaves either way, ${low}..${high}`);
  }
  assert.ok(param('envelope', 'release').default > 0, 'a release to start, a trigger running on past the note-off');
  assert.equal(param('oscillator', 'sync').default, 0, 'free to start, as every oscillator and LFO');
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

test("a saturation's oversampling and a shaper lag's the one spec, so the dry is held back as long as the wet at the same choice, 4x to start", () => {
  const oversample = (kind) => BLOCKS[kind].params.find(({ name }) => name === 'oversample');
  assert.deepEqual(oversample('saturation'), OVERSAMPLE);
  assert.deepEqual(oversample('shaper lag'), OVERSAMPLE);
  assert.deepEqual(OVERSAMPLE.choices, ['none', '2x', '4x'], "Web Audio's own names");
  assert.equal(OVERSAMPLE.default, '4x');
});

test("the worklet sources' choices are params, changed as they play or read once as a voice is made: no settings; each a source with a stop", () => {
  for (const kind of ['sync oscillator', 'operators', 'phase distortion']) {
    assert.deepEqual(BLOCKS[kind].settings, [], `${kind}: no settings`);
    assert.deepEqual(BLOCKS[kind].inputs, [], `${kind}: a source`);
    assert.equal(BLOCKS[kind].params.at(-1).name, 'stop', `${kind}: its stop last, as an oscillator's`);
  }
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  for (const kind of ['sync oscillator', 'operators', 'phase distortion']) {
    assert.equal(param(kind, 'frequency').taper, 'octaves', `${kind}: its frequency by octaves`);
    const [low, high] = param(kind, 'detune').range;
    assert.ok(low <= -4800 && high >= 4800, `${kind}: a tune of four octaves either way`);
  }
});

test("the worklet effects' choices are params, changed as they play: no settings; each a processor of one input and one output, grains a tail", () => {
  for (const kind of ['crusher', 'grains', 'saturating filter', 'germanium stage']) {
    assert.deepEqual(BLOCKS[kind].settings, [], `${kind}: no settings`);
    assert.deepEqual(
      [BLOCKS[kind].inputs, BLOCKS[kind].outputs].map((jacks) => jacks.map(({ name }) => name)),
      [['in'], ['out']],
      `${kind}: an effect`,
    );
  }
  assert.equal(BLOCKS.grains.tail, true, "its grains ring on past its input, so Silence doesn't cut them off");
  assert.equal(BLOCKS.crusher.tail, undefined);
  const param = (kind, name) => BLOCKS[kind].params.find((spec) => spec.name === name);
  assert.deepEqual(
    [param('crusher', 'rate').taper, param('saturating filter', 'frequency').taper],
    ['octaves', 'octaves'],
  );
  assert.ok(isSwitch(param('grains', 'freeze')), 'a freeze is a switch');
  const [low, high] = param('saturating filter', 'detune').range;
  assert.ok(low <= -4800 && high >= 4800, 'a tune of four octaves either way');
});

test("the grains' memory and the three blocks' specs are read by their builders by name", () => {
  assert.equal(GRAINS_MEMORY, 2, 'seconds of its input a grains block keeps');
  assert.deepEqual(CRUSHER_SPECS.bits.range, [1, 16, 0.1]);
  assert.deepEqual(Object.keys(GRAINS_SPECS), ['freeze', 'position', 'size', 'density', 'pitch', 'spray']);
  assert.deepEqual(
    SATURATING_FILTER_SPECS.mode.choices,
    ['ladder', 'lowpass', 'bandpass', 'highpass'],
    "the processor's indexes",
  );
});

test("the plain blocks' choices are params, changed as they play: no settings; a wow a source, a room a tail", () => {
  for (const kind of ['shaper', 'eq band', 'compressor', 'wow', 'room']) {
    assert.deepEqual(BLOCKS[kind].settings, [], `${kind}: no settings`);
  }
  assert.deepEqual(BLOCKS.wow.inputs, [], 'a source');
  assert.equal(BLOCKS.room.tail, true, "its room rings on past its input, so Silence doesn't cut it off");
  for (const kind of ['shaper', 'eq band', 'compressor', 'wow']) {
    assert.equal(BLOCKS[kind].tail, undefined, kind);
  }
  assert.deepEqual([BLOCKS.wow.params[0].taper, BLOCKS['eq band'].params[1].taper], ['octaves', 'octaves']);
});

test("a shaper's oversampling is the saturation's choices at 2x to start, an eq band's type read by its builder by name", () => {
  assert.deepEqual(SHAPER_SPECS.oversample.choices, OVERSAMPLE.choices, "Web Audio's own names");
  assert.equal(SHAPER_SPECS.oversample.default, '2x');
  assert.deepEqual(EQ_BAND_SPECS.type.choices, ['highpass', 'low shelf', 'peak', 'high shelf']);
});

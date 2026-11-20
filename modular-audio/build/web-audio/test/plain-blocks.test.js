// The plain Web Audio blocks as the builder makes them (mockup/src/libs/modular-audio/build/web-audio/blocks/), on the stand-in
// for Web Audio:
//   - a shaper, a WaveShaper whose curve is made again as its drive and shape are told;
//   - an eq band, one biquad of its type, a highpass's Q told in dB;
//   - a compressor, the browser's node into a gain that takes its make-up back, the limiter's make-up at a hard knee;
//   - a wow, a looping buffer of drift, one draw of the builder's random whatever its length;
//   - a room, a convolver of a designed impulse, the buffer of a design made once by the context's buffers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { into, outOf, StandInContext } from './audio-stand-in.js';
import { Buffers, WebAudioBuilder } from '../index.ts';
import { builtOn, oneBlockPlan } from './blocks.js';
import { compressorMakeup } from '../../../../dsp/dynamics/index.ts';
import { seeded } from '../../../../base/util/index.ts';
import { near } from '../../../../base/util/test/near.js';

// a param's value as last told: set now, it's scheduled at the context's time
const told = (param) => param.events.at(-1)?.[1] ?? param.value;
const dB = (gain) => 20 * Math.log10(gain);

// a block of one kind built between a source and the output, at the values given
const blockOn = (kind, values) => builtOn(oneBlockPlan(kind, values), { from: 'in' });

test("a shaper made a WaveShaper: its curve from its drive and shape, oversampled as planned; bent again as it's set", () => {
  const { made, what, source, context } = blockOn('shaper', { drive: 4 });
  const [shaper] = made('waveshaper');
  assert.equal(shaper.oversample, '2x');
  assert.equal(shaper.curve.length, 2049);
  assert.deepEqual(outOf(context, source), [shaper]);
  assert.deepEqual(into(context, context.destination), [shaper]);
  const before = shaper.curve;
  what.set(['drive'], 16);
  assert.notEqual(shaper.curve, before);
  assert.ok(shaper.curve.at(-1) < before.at(-1), 'driven harder: a peak bent further');
  const driven = shaper.curve;
  what.set(['shape'], 1);
  assert.notEqual(shaper.curve, driven, 'a harder knee, another curve');
  what.set(['oversample'], '4x');
  assert.equal(shaper.oversample, '4x');
  assert.deepEqual(what.placeholders, []);
});

test('an eq band: a low shelf at 100 Hz and a gain of 2 is one biquad, lowshelf, its gain in dB', () => {
  const { made } = blockOn('eq band', { type: 'low shelf', frequency: 100, gain: 2 });
  const biquads = made('biquad');
  assert.equal(biquads.length, 1);
  const [band] = biquads;
  assert.equal(band.type, 'lowshelf');
  assert.equal(band.frequency.value, 100);
  near(band.gain.value, 6.02, 'its gain in dB', 0.01);
});

test("an eq band: a highpass' Q told in dB as Web Audio reads it, a peak's as it is; its type changed as it plays, the Q told again", () => {
  const highpass = blockOn('eq band', { type: 'highpass', resonance: 0.707 });
  const [flat] = highpass.made('biquad');
  assert.equal(flat.type, 'highpass');
  near(flat.Q.value, -3.01, 'flat, in dB', 0.01);
  const { made, what } = blockOn('eq band', { type: 'peak', resonance: 2 });
  const [band] = made('biquad');
  assert.equal(band.type, 'peaking');
  assert.equal(band.Q.value, 2);
  what.set(['type'], 'highpass');
  assert.equal(band.type, 'highpass');
  near(told(band.Q), 6.02, 'the ratio of 2 told again, in dB', 0.01);
});

test('a compressor: one node at its threshold, knee, ratio, attack and release, into a gain taking its make-up back', () => {
  const { made, what } = blockOn('compressor');
  const [compressor] = made('compressor');
  const [back] = made('gain');
  assert.deepEqual(
    ['threshold', 'knee', 'ratio', 'attack', 'release'].map((name) => compressor[name].value),
    [-18, 6, 2, 0.02, 0.2],
  );
  near(back.gain.value, 0.592, 'the make-up of a soft knee taken back', 0.002);
  what.set(['threshold'], -12);
  assert.equal(told(compressor.threshold), -12);
  near(
    told(back.gain),
    10 ** (-compressorMakeup({ threshold: -12, knee: 6, ratio: 2 }) / 20),
    'the make-up taken back at the new threshold',
  );
  what.set(['ratio'], 4, { at: 3, glide: 0.5 });
  assert.deepEqual(compressor.ratio.events.at(-1).slice(0, 3), ['target', 4, 3]);
  const [, makeup, at] = back.gain.events.at(-1);
  near(makeup, 10 ** (-compressorMakeup({ threshold: -12, knee: 6, ratio: 4 }) / 20), 'told the same way');
  assert.equal(at, 3);
  what.set(['attack'], 0.05);
  assert.equal(told(compressor.attack), 0.05);
  assert.deepEqual(what.placeholders, []);
});

test("a compressor at the limiter's settings, a hard knee at -0.3 dBFS and 20:1, takes back the make-up the limiter does", () => {
  const compressed = blockOn('compressor', { threshold: -0.3, knee: 0, ratio: 20 });
  const [back] = compressed.made('gain');
  const limited = builtOn(oneBlockPlan('limiter', { ceiling: -0.3 }), { from: 'in' });
  const [limiterBack] = limited
    .made('gain')
    .filter((node) => outOf(limited.context, node).includes(limited.context.destination));
  near(dB(back.gain.value), -0.171, "the compressor's", 0.001);
  near(dB(limiterBack.gain.value), dB(back.gain.value), "the limiter's, the same");
});

// a wow built on a `random` handed in: its looping buffer's samples
function wowOn(random) {
  const context = new StandInContext(() => 2);
  new WebAudioBuilder({ context, beat: () => 0.5, random }).build(oneBlockPlan('wow'), { into: context.destination });
  return context.rec.nodes.find((node) => node.kind === 'buffer').buffer.getChannelData(0);
}
// the first index where two sample arrays part, -1 where they don't
const firstApart = (first, second) => first.findIndex((sample, index) => sample !== second[index]);

test('a wow: one looping buffer source of 512000 frames at 8000 Hz, played at a rate of 1, started with the rest; its frequency the playback rate, cabled', () => {
  const { made, what, context } = builtOn(oneBlockPlan('wow'));
  const [source] = made('buffer');
  assert.equal(made('buffer').length, 1);
  assert.equal(source.loop, true);
  assert.equal(source.buffer.length, 512000);
  assert.equal(source.buffer.sampleRate, 8000);
  assert.equal(source.playbackRate.value, 1);
  assert.equal(source.starts.length, 1, 'started');
  assert.deepEqual(into(context, context.destination), [source]);
  what.set(['frequency'], 2);
  assert.equal(told(source.playbackRate), 2);
  assert.deepEqual(what.placeholders, []);
});

test("a wow draws once from the random handed in, whatever its buffer's length; the same draw gives the same buffer, another draw another", () => {
  let draws = 0;
  wowOn(() => {
    draws++;
    return 0.5;
  });
  assert.equal(draws, 1);
  assert.equal(
    firstApart(
      wowOn(() => 0.5),
      wowOn(() => 0.5),
    ),
    -1,
    'the same draw: no index where they part',
  );
  assert.ok(
    firstApart(
      wowOn(() => 0.5),
      wowOn(() => 0.25),
    ) >= 0,
    'another draw: they part',
  );
});

const energyOf = (samples) => samples.reduce((sum, sample) => sum + sample * sample, 0);

// a room built in a context, its builder handed the buffers and the draws counted
function roomOn(values, { buffers, context = new StandInContext(() => 2) } = {}) {
  const draws = { count: 0 };
  const next = seeded(1);
  const random = () => {
    draws.count++;
    return next();
  };
  const options = { context, beat: () => 0.5, random, buffers: buffers ?? new Buffers(context, random) };
  const what = new WebAudioBuilder(options).build(oneBlockPlan('room', values), { into: context.destination });
  const [convolver] = context.rec.nodes.filter((node) => node.kind === 'convolver');
  return { context, what, convolver, draws, options };
}

test('a room: one convolver, normalizing off, one channel in, 2 channels of 960 + 43200 frames at decay 0.9 with energy 1; two draws', () => {
  const { convolver, context, draws } = roomOn({ decay: 0.9 });
  assert.equal(context.rec.nodes.filter((node) => node.kind === 'convolver').length, 1);
  assert.equal(convolver.normalize, false);
  assert.equal(convolver.props.channelCount, 1);
  assert.equal(convolver.props.channelCountMode, 'explicit');
  assert.equal(convolver.buffer.numberOfChannels, 2);
  assert.equal(convolver.buffer.length, 44160);
  near(energyOf(convolver.buffer.getChannelData(0)), 1, 'its side has energy 1', 1e-3);
  assert.equal(draws.count, 2);
});

test('a room told another decay gets another buffer (4 draws, 96960 frames); told the first again, the first buffer and no more draws', () => {
  const { what, convolver, draws } = roomOn({ decay: 0.9 });
  const first = convolver.buffer;
  what.set(['decay'], 2);
  assert.notEqual(convolver.buffer, first, 'another object');
  assert.equal(convolver.buffer.length, 96960);
  assert.equal(draws.count, 4);
  what.set(['decay'], 0.9);
  assert.ok(convolver.buffer === first, 'the first again');
  assert.equal(draws.count, 4);
  assert.deepEqual(what.placeholders, []);
});

test("a room's other five params each tell the convolver a buffer of their design, two draws each; a design asked again of the same buffers draws nothing", () => {
  const { what, convolver, draws, options, context } = roomOn({ decay: 0.5 });
  const lengths = [];
  for (const [name, value] of [
    ['pre delay', 0.05],
    ['taps', 3],
    ['dense', 0.03],
    ['low decay', 1.5],
    ['high decay', 0.2],
  ]) {
    what.set([name], value);
    lengths.push(convolver.buffer.length);
  }
  // the pre-delay 2400 frames, the longest band's time the rest: 0.5 s, then the low band at 1.5 times, 0.75 s
  assert.deepEqual(lengths, [26400, 26400, 26400, 38400, 38400]);
  assert.equal(draws.count, 2 * 6, 'six designs, two draws each');
  new WebAudioBuilder(options).build(oneBlockPlan('room', { decay: 0.5 }), { into: context.destination });
  assert.equal(draws.count, 2 * 6, 'the first design asked again of the same buffers: no draw');
});

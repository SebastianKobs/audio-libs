// The Drive's blocks as the builder makes them (modular-audio/build/web-audio/blocks/), on the stand-in for Web Audio:
//   - a saturation: its style's colors, the drive into its curve over ±8, a DC block, its level taken back; its drive glided;
//   - a tilt, two shelves about its pivot; a one pole, an IIR filter made again as its cutoff moves;
//   - a shaper lag, a delay at the lag the builder is handed, Chromium's where none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { into, outOf, StandInContext } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { builtOn, oneBlockPlan } from './blocks.js';
import { autoGain, CURVE_SPAN, curveGain, driveCurve } from '../../../../dsp/saturation/index.ts';
import { onePoleLowpass } from '../../../../dsp/filters/index.ts';
import { near } from '../../../../base/util/test/near.js';

// a param's value as last told: set now, it's scheduled at the context's time
const told = (param) => param.events.at(-1)?.[1] ?? param.value;

// a block of one kind built between a source and the output, at the values given
const blockOn = (kind, values) => builtOn(oneBlockPlan(kind, values), { from: 'in' });

test("a saturation: its colors, its drive into the style's curve over ±8, a DC block, its colors, its level taken back", () => {
  const { made, what, source, context } = blockOn('saturation', { drive: 4, style: 'console' });
  const [shaper] = made('waveshaper');
  const [push, level] = made('gain');
  const biquads = made('biquad');
  assert.equal(shaper.oversample, '4x');
  assert.equal(shaper.curve.length, driveCurve('console').length);
  assert.deepEqual(
    biquads.slice(0, 3).map(({ type }) => type),
    ['lowshelf', 'peaking', 'highshelf'],
    'its color before',
  );
  assert.equal(outOf(context, source)[0], biquads[0]);
  assert.deepEqual(outOf(context, push), [shaper]);
  const [dcBlock] = outOf(context, shaper);
  assert.equal(dcBlock.type, 'highpass');
  assert.ok(dcBlock.frequency.value <= 20, 'a DC block, under the sound');
  assert.deepEqual(into(context, context.destination), [level]);
  near(push.gain.value, curveGain('console', 4, 0) / CURVE_SPAN, 'the drive and its heat, over the span');
  near(level.gain.value, autoGain('console', curveGain('console', 4, 0)), 'its level taken back');
  assert.equal(biquads[0].gain.value, 3, 'console: its lows fed in fuller');
  what.set(['punish'], 1);
  near(told(push.gain), curveGain('console', 4, 1) / CURVE_SPAN, 'punished: +20 dB');
  const consoleCurve = shaper.curve;
  what.set(['style'], 'pentode');
  assert.notEqual(shaper.curve, consoleCurve, 'another style, another curve');
  assert.equal(biquads[0].gain.value, 0, 'pentode: no low shelf');
  assert.equal(biquads[1].gain.value, 3, 'pentode: its mids pushed');
  what.set(['auto'], 0);
  assert.equal(told(level.gain), 1, 'auto off: the level rising with the drive');
  what.set(['oversample'], 'none');
  assert.equal(shaper.oversample, 'none');
  assert.deepEqual(what.placeholders, []);
});

test("a saturation's curve is its own: two of one style hold the same points, neither the other's table", () => {
  const first = blockOn('saturation', { style: 'triode' });
  const second = blockOn('saturation', { style: 'triode' });
  const [one] = first.made('waveshaper');
  const [other] = second.made('waveshaper');
  assert.notEqual(one.curve, other.curve);
  assert.deepEqual(Array.from(one.curve.slice(0, 8)), Array.from(other.curve.slice(0, 8)));
});

test("a saturation's drive glided: the push and the level taken back glide together, at its time", () => {
  const { made, what } = blockOn('saturation');
  const [push, level] = made('gain');
  what.set(['drive'], 8, { at: 3, glide: 0.5 });
  const [kind, to, at] = push.gain.events.at(-1);
  assert.equal(kind, 'target');
  assert.equal(at, 3);
  assert.ok(to > 0);
  assert.deepEqual(level.gain.events.at(-1).slice(0, 3), ['target', autoGain('smooth', curveGain('smooth', 8, 0)), 3]);
});

test('a tilt: a low shelf and a high shelf at its pivot, the highs up and the lows down by half of it each', () => {
  const { made, what } = blockOn('tilt', { tilt: 10 ** (8 / 20) });
  const [low, high] = made('biquad');
  assert.deepEqual([low.type, high.type], ['lowshelf', 'highshelf']);
  assert.equal(low.frequency.value, 800);
  assert.equal(high.frequency.value, 800);
  near(low.gain.value, -4, 'the lows down by half');
  near(high.gain.value, 4, 'the highs up by half');
  what.set(['tilt'], 10 ** (-6 / 20));
  near(told(low.gain), 3, 'darker: the lows up');
});

test('a one pole: an IIR filter of its cutoff, made again in its place as its cutoff moves', () => {
  const { made, what, context } = blockOn('one pole', { frequency: 6000 });
  const [first] = made('iir');
  assert.deepEqual(first.extra.feedforward, onePoleLowpass(6000, 48000).feedforward);
  const [before] = into(context, first);
  const [after] = outOf(context, first);
  what.set(['frequency'], 3000);
  const [, second] = made('iir');
  assert.deepEqual(second.extra.feedback, onePoleLowpass(3000, 48000).feedback);
  assert.deepEqual(outOf(context, before), [second], 'the old one out');
  assert.deepEqual(outOf(context, second), [after]);
});

test('a one pole taken apart with the rest: the filter it made again let go too', () => {
  const { made, what, context } = blockOn('one pole', { frequency: 6000 });
  what.set(['frequency'], 3000);
  const filters = made('iir');
  assert.equal(filters.length, 2);
  what.dispose();
  for (const filter of filters) {
    assert.ok(context.rec.disconnects.includes(filter), 'disconnected');
  }
});

// a shaper lag built on a stand-in context, the builder handed the lags it's to hold the dry back by, none to take Chromium's
function lagOn(shaperLags, values) {
  const context = new StandInContext(() => 2);
  const builder = new WebAudioBuilder({
    context,
    beat: () => 0.5,
    random: () => 0.5,
    ...(shaperLags && { shaperLags }),
  });
  const what = builder.build(oneBlockPlan('shaper lag', values), { into: context.destination });
  return { what, delay: context.rec.nodes.find(({ kind }) => kind === 'delay') };
}

test("a shaper lag: the dry held back as long as a shaper oversampling as it does, Chromium's lags where the builder has none", () => {
  const { what, delay } = lagOn(undefined);
  assert.equal(delay.delayTime.value, 192 / 48000);
  what.set(['oversample'], '2x');
  assert.equal(delay.delayTime.value, 128 / 48000);
  what.set(['oversample'], 'none');
  assert.equal(delay.delayTime.value, 0);
});

test("a shaper lag held back by the lags it's handed: Firefox's 8 samples at 2x, the choice it's planned with", () => {
  const { delay } = lagOn({ none: 0, '2x': 8, '4x': 8 }, { oversample: '2x' });
  assert.equal(delay.delayTime.value, 8 / 48000);
});

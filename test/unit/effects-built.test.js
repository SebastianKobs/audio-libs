// The effects (modular-audio/plan/effects/) planned, then built on the Web Audio builder's stand-in: each wired as its
// template says, its nodes where its blocks make them. The library's build tests can't import a template, so it's here.
//   - the Drive: its sound into the wet chain and the held-back dry, the curve between, both into its trim;
//   - the Align's one delay at the lag it waits for; the Crusher's and the Grains' worklets;
//   - the Chorus's and the Juno chorus's LFOs into their lines' times; the Ducker's level automated by the kicks;
//   - the Isolator's eight biquads; the tape echo's time gliding to a tempo; the hiss's two looping buffers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outOf, StandInContext } from '../../modular-audio/build/web-audio/test/audio-stand-in.js';
import { standInWorklets } from '../../modular-audio/build/web-audio/test/worklet-nodes.js';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';
import { EFFECT_FORM, chorusValues, duckEvents, TAPE_GLIDE } from '../../modular-audio/plan/effects/index.ts';
import { EFFECT_TEMPLATES } from '../../modular-audio/plan/effects/content.ts';
import { Planner } from '../../modular-audio/plan/planner/index.ts';
import { near } from '../../base/util/test/near.js';

const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);

// an effect planned and built between a source and the output, on a stand-in context
function builtOn(kind, asked) {
  const context = new StandInContext(() => 1);
  const source = context.createGain();
  const worklets = standInWorklets(['crusher', 'grains']);
  const built = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets }).build(
    planner.plan(kind, { beat: 0.5, ...asked }),
    { into: context.destination, from: { in: source } },
  );
  return {
    context,
    source,
    built,
    made: (nodeKind) => context.rec.nodes.filter((node) => node.kind === nodeKind && node !== source),
  };
}

// every node a node's sound reaches
function reachedFrom(context, from) {
  const seen = new Set();
  const next = [from];
  while (next.length > 0) {
    for (const node of outOf(context, next.pop())) {
      if (!seen.has(node)) {
        seen.add(node);
        next.push(node);
      }
    }
  }
  return seen;
}

test('the Drive built: its sound into the wet chain and the held-back dry, the curve between, both into its trim', () => {
  const { made, context, source } = builtOn('Drive');
  const [shaper] = made('waveshaper');
  const [lag] = made('delay');
  const firsts = outOf(context, source);
  assert.equal(firsts.length, 2, 'wet and dry');
  assert.ok(firsts.includes(lag), 'the dry through its lag');
  assert.equal(firsts.find((node) => node !== lag).type, 'highpass', 'the wet through the low cut first');
  assert.ok(reachedFrom(context, source).has(shaper));
  assert.ok(reachedFrom(context, shaper).has(context.destination));
  assert.ok(!reachedFrom(context, lag).has(shaper), 'the dry never bent');
});

test('the Align built: one delay of 4 ms, the lag of 4x at 48 kHz, and none at none', () => {
  const { made } = builtOn('Align');
  assert.equal(made('delay').length, 1);
  assert.equal(made('delay')[0].delayTime.value, 192 / 48000, '192 samples at 48 kHz');
  assert.equal(builtOn('Align', { values: { oversample: 'none' } }).made('delay')[0].delayTime.value, 0);
});

test("the Crusher's and the Grains' blocks built as worklets of their processors", () => {
  assert.equal(builtOn('Crusher').made('worklet')[0].extra.processor, 'crusher');
  assert.equal(builtOn('Grains').made('worklet')[0].extra.processor, 'grains');
});

test("the Chorus built: one triangle LFO, through its depth into each line's time, in seconds", () => {
  const { made, context } = builtOn('Chorus', { values: chorusValues({ rate: 0.9, depth: 0.002 }) });
  const [lfo, ...others] = made('oscillator');
  assert.equal(others.length, 0, 'one LFO');
  assert.equal(lfo.type, 'triangle');
  assert.equal(outOf(context, lfo).length, 3, 'into the first depth and both lags');
});

test("the ducking automated on the Ducker's level reaches its gain", () => {
  const { built, made } = builtOn('Ducker');
  const [duck] = made('gain');
  built.automate(['level'], duckEvents([3], { depth: 0.5, attack: 0.01, release: 0.2 }), 0);
  assert.deepEqual(duck.gain.events.at(-2).slice(0, 3), ['target', 0.5, 3]);
});

test('the Isolator built: eight biquads, four lowpass and four highpass, each at a Q of -3.01 dB (0.707, Linkwitz-Riley halves)', () => {
  const biquads = builtOn('Isolator').made('biquad');
  assert.equal(biquads.length, 8);
  assert.equal(biquads.filter(({ type }) => type === 'lowpass').length, 4);
  assert.equal(biquads.filter(({ type }) => type === 'highpass').length, 4);
  for (const biquad of biquads) {
    near(biquad.Q.value, -3.01, `${biquad.type}: its Q`, 0.01);
  }
});

test("the Juno chorus built: one triangle LFO into both depths, each depth into its line's time", () => {
  const { made, context } = builtOn('JunoChorus');
  const [lfo, ...others] = made('oscillator');
  assert.equal(others.length, 0, 'one LFO');
  assert.equal(lfo.type, 'triangle');
  assert.equal(outOf(context, lfo).length, 2, 'into both depths');
  assert.equal(made('delay').length, 2);
});

test("the tape echo built at 1/8. and told a tempo of 0.4: the line's time glides by setTargetAtTime at TAPE_GLIDE", () => {
  const { made, built } = builtOn('TapeEcho', { values: { note: '1/8.' } });
  built.tempo(0.4);
  const [kind, to, at, glide] = made('delay')[0].delayTime.events.at(-1);
  assert.equal(kind, 'target');
  near(to, 0.3, 'the new time', 1e-9);
  near(at, 1, 'from now', 1e-9);
  near(glide, TAPE_GLIDE, 'its glide', 1e-9);
});

test('the hiss built: two looping buffers, two panners at -1 and 1 left as Web Audio makes them', () => {
  const { made } = builtOn('Hiss');
  const buffers = made('buffer');
  assert.equal(buffers.length, 2);
  for (const source of buffers) {
    assert.equal(source.loop, true);
  }
  const panners = made('panner');
  assert.equal(panners.length, 2);
  const pans = panners.map(
    (panner) =>
      panner.pan.events
        .filter(([kind]) => kind === 'set')
        .map(([, to]) => to)
        .at(-1) ?? panner.pan.value,
  );
  assert.deepEqual(
    pans.sort((first, second) => first - second),
    [-1, 1],
  );
  for (const panner of panners) {
    assert.equal(panner.props.channelCountMode, undefined);
  }
});

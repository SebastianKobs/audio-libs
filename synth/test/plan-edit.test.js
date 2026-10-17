// A sounding note following an edit to its instrument (G0.2a, mockup/architecture/done.md), on patches written by hand: its plan
// before and after compared, the operations that move what's built from a time, as a synth's knob turned while a note sounds: a value
// gliding there with a 50 ms time constant, an envelope's rest planned again from where it is, a note let go or a value a control set
// since left as it plays; a change of structure told apart, a rebuild's. Every theme's instruments' went with their patches (LAY15b)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fadeIn, fadeOut, plan, adsr } from '../index.ts';
import { followEdit } from '../../audio-plan/index.ts';
import { SMOOTHING } from '../../automation/index.ts';
import { levelAt } from '../../automation/index.ts';

// a small voice: a triangle into a lowpass, its VCA moved by an envelope that rises over a second, falls to half over half a second and
// holds there until it's let go, fading over 0.3 s
const VOICE = {
  vca: { level: 0.2 },
  filter: { type: 'lowpass', freq: 800 },
  oscs: [{ wave: 'triangle', ratio: 1, level: 0.5 }],
  envelopes: [{ target: 'vca.gain', ...adsr({ attack: 1, decay: 0.5, sustain: 0.5, release: 0.3 }) }],
};

const HELD = { pitch: 60, velocity: 1 }; // held until it's let go

const SHORT = { pitch: 60, velocity: 1, duration: 1 }; // let go a second in

const CONTEXT = { random: () => 0.5 };

// the voice with a block's values changed, the rest as it was
const edited = (block, values) => ({ ...VOICE, [block]: { ...VOICE[block], ...values } });

const withEnvelope = (values) => ({ ...VOICE, envelopes: [{ ...VOICE.envelopes[0], ...values }] });

const withOsc = (values) => ({ ...VOICE, oscs: [{ ...VOICE.oscs[0], ...values }] });

// a node of a plan, by its block and kind: its id
const idOf = (planned, block, node) => planned.nodes.find((made) => made.block === block && made.node === node).id;

test('an unchanged patch: nothing to do', () => {
  assert.deepEqual(followEdit(plan(VOICE, HELD, CONTEXT), plan(VOICE, HELD, CONTEXT), 2), []);
});

test("a value changed while the note holds, an osc's level, a cutoff: glided there from where it is, by 50 ms", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  assert.deepEqual(followEdit(before, plan(withOsc({ level: 0.6 }), HELD, CONTEXT), 2), [
    {
      id: idOf(before, 'osc 1', 'gain'),
      param: 'gain',
      events: [
        ['cancel', 2],
        ['set', 0.5, 2],
        ['target', 0.6, 2, 0.05],
      ],
    },
  ]);
  assert.deepEqual(followEdit(before, plan(edited('filter', { freq: 1200 }), HELD, CONTEXT), 2), [
    {
      id: idOf(before, 'filter', 'biquad'),
      param: 'frequency',
      events: [
        ['cancel', 2],
        ['set', 800, 2],
        ['target', 1200, 2, 0.05],
      ],
    },
  ]);
});

test('a value changed glided there by the smoothing asked for', () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const [moved] = followEdit(before, plan(withOsc({ level: 0.6 }), HELD, CONTEXT), 2, [], 0.2);
  assert.deepEqual(moved.events.at(-1), ['target', 0.6, 2, 0.2]);
});

test("an edit and a control's set glide by one smoothing, 50 ms", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const [edit] = followEdit(before, plan(withOsc({ level: 0.6 }), HELD, CONTEXT), 2);
  const [set] = before.controls.set('vca.level', 0.3, 2);
  assert.equal(SMOOTHING, 0.05);
  assert.equal(edit.events.at(-1)[3], SMOOTHING);
  assert.equal(set.events.at(-1)[3], SMOOTHING);
});

test("an envelope's attack lengthened while it rises: its rise taken on from where it is to its new end, its fall from there", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const [vca] = followEdit(before, plan(withEnvelope({ attack: 2 }), HELD, CONTEXT), 0.5);
  assert.equal(vca.id, idOf(before, 'vca', 'gain'));
  assert.deepEqual(vca.events, [
    ['cancel', 0.5],
    ['linear', levelAt(before.nodes[vca.id].params.gain, 0.5), 0.5], // its rise cut where it is, so it runs up to there
    ['linear', 1, 2],
    ['exp', 0.5, 2.5],
  ]);
});

test("an envelope's sustain lowered while it holds: glided down to it by 50 ms", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  assert.deepEqual(followEdit(before, plan(withEnvelope({ sustain: 0.25 }), HELD, CONTEXT), 2), [
    {
      id: idOf(before, 'vca', 'gain'),
      param: 'gain',
      events: [
        ['cancel', 2],
        ['set', 0.5, 2],
        ['target', 0.25, 2, 0.05],
      ],
    },
  ]);
});

test('a note let go, then its sustain edited: its release took the envelope over, so it fades on as it plays', () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const letGo = before.controls.release(3);
  assert.deepEqual(followEdit(before, plan(withEnvelope({ sustain: 0.25 }), HELD, CONTEXT), 3.1, letGo), []);
});

test("a value a control set since stays the control's: the VCA's level set to 0.3, then the patch's changed, as it plays", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const set = before.controls.set('vca.level', 0.3, 1);
  assert.deepEqual(followEdit(before, plan(edited('vca', { level: 0.4 }), HELD, CONTEXT), 2, set), []);
});

test("a note with a length, its release lengthened before it's let go: its fall and its sources' stops moved on", () => {
  const before = plan(VOICE, SHORT, CONTEXT);
  const ops = followEdit(before, plan(withEnvelope({ release: 0.6 }), SHORT, CONTEXT), 0.5);
  const vca = ops.find((op) => op.id === idOf(before, 'vca', 'gain'));
  assert.deepEqual(vca.events, [
    ['cancel', 0.5],
    ['linear', levelAt(before.nodes[vca.id].params.gain, 0.5), 0.5], // its rise cut where it is, so it runs up to there
    ['linear', 1, 1],
    ['exp', 1, 1],
    ['exp', 0.0005, 1.6],
  ]);
  assert.deepEqual(
    ops.filter((op) => op.stop !== undefined),
    [{ id: idOf(before, 'osc 1', 'oscillator'), stop: 1.6 }],
  );
});

test('a release shortened past now: the sources stopped at once', () => {
  const before = plan(VOICE, SHORT, CONTEXT);
  const ops = followEdit(before, plan(withEnvelope({ release: 0.05 }), SHORT, CONTEXT), 1.2);
  assert.deepEqual(
    ops.filter((op) => op.stop !== undefined),
    [{ id: idOf(before, 'osc 1', 'oscillator'), stop: 1.2 }],
  );
});

test("a change of structure, a rebuild's: a block added, an osc's wave, its detune pair split", () => {
  const before = plan(VOICE, HELD, CONTEXT);
  const lfo = { ...VOICE, lfos: [{ rate: 0.1, depth: 100, target: 'filter.frequency', free: true }] };
  for (const [what, patch] of [
    ['an LFO added', lfo],
    ['the wave', withOsc({ wave: 'sawtooth' })],
    ['a detune pair', withOsc({ detune: [-5, 5] })],
  ]) {
    assert.equal(followEdit(before, plan(patch, HELD, CONTEXT), 2), null, what);
  }
});

// a plan's out, the gain every voice leaves by: its node
const outOf = (planned) => planned.nodes.find((made) => made.block === 'out' && made.node === 'gain');

test('a voice rebuilt crossfades (G0.2b): the old one faded out from where it is to nothing, its sources stopped once it has, none later than its own stop', () => {
  const before = plan(VOICE, SHORT, CONTEXT);
  assert.deepEqual(fadeOut(before, 0.5, 0.1), [
    {
      id: outOf(before).id,
      param: 'gain',
      events: [
        ['cancel', 0.5],
        ['set', 1, 0.5],
        ['linear', 0, 0.6],
      ],
    },
    { id: idOf(before, 'osc 1', 'oscillator'), stop: 0.6 },
  ]);
  assert.deepEqual(
    fadeOut(before, 1.25, 0.1).filter((op) => op.stop !== undefined),
    [{ id: idOf(before, 'osc 1', 'oscillator'), stop: 1.3 }],
    'its own stop sooner: kept',
  );
  assert.deepEqual(
    fadeOut(before, 1.5, 0.1).filter((op) => op.stop !== undefined),
    [],
    'stopped already: nothing to stop',
  );
});

test("a voice rebuilt crossfades (G0.2b): the new one's plan, its out from nothing at the edit up to its level over the fade, the rest as planned", () => {
  const after = plan(withOsc({ wave: 'sawtooth' }), HELD, CONTEXT);
  const faded = fadeIn(after, 2, 0.1);
  assert.deepEqual(outOf(faded).params.gain, [
    ['value', 1],
    ['set', 0, 2],
    ['linear', 1, 2.1],
  ]);
  assert.deepEqual(
    faded.nodes.filter((node) => node !== outOf(faded)),
    after.nodes.filter((node) => node !== outOf(after)),
    'every other node as planned',
  );
  assert.deepEqual(outOf(after).params.gain, [['value', 1]], "the plan it's made from left as it was");
});

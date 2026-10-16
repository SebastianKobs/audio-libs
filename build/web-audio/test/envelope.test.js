// An envelope in Web Audio (mockup/src/libs/build/web-audio/blocks/envelope.ts), on the stand-in:
//   - a constant source, started as it's built, silent until its gate opens;
//   - its gate opened at a time: its curve drawn from 0 there, by its curve and its amount;
//   - closed: a gate's released from where it is then; a trigger's running on;
//   - a stage, its sustain or its amount changed as it sounds: drawn again from where it is
//     then; before its gate opens, kept for it;
//   - opened again: drawn from 0 again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { oneBlockPlan } from './blocks.js';
import { SMOOTHING } from '../../../automation/index.ts';
import { SILENCE } from '../../../params/index.ts';

// a pluck's stages, its amount 2; times a float adds up exactly
const PLUCK = { attack: 0.25, decay: 0.5, sustain: 0.5, release: 0.25, amount: 2 };

// An envelope built at 4 s on a stand-in context, in a line unless asked:
// its constant source, and what its level is told from an event on.
function envelopeOn(values = PLUCK, settings = {}) {
  const context = new StandInContext(() => 4);
  const plan = oneBlockPlan('envelope', values, { curve: 'linear', ...settings });
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
  });
  const [source] = context.rec.nodes.filter((node) => node.kind === 'constant');
  const told = (from) => source.offset.events.slice(from);
  return { context, what, source, told };
}
// what its level is told as its gate opens at 5 s, a pluck's in a line
const OPENED = [
  ['cancel', 5],
  ['set', 0, 5],
  ['linear', 2, 5.25],
  ['linear', 1, 5.75],
];

test("an envelope a constant source, started as it's built, silent until its gate opens, into where it goes", () => {
  const { context, what, source } = envelopeOn();
  assert.equal(source.starts.length, 1);
  assert.deepEqual(source.offset.events, [['value', 0]]);
  assert.deepEqual(what.placeholders, []);
  assert.deepEqual(into(context, context.destination), [source]);
});

test('its gate opened at a time: its curve drawn from 0 there, by its amount; closed, released from where it is then', () => {
  const { what, told } = envelopeOn();
  what.set(['gate'], 1, { at: 5 });
  assert.deepEqual(told(1), OPENED);
  what.set(['gate'], 0, { at: 6 });
  assert.deepEqual(told(5), [
    ['cancel', 6],
    ['set', 1, 6],
    ['linear', 0, 6.25],
  ]);
});

test('its curve exponential unless it says: up in a line from the floor of silence, down straight in dB', () => {
  const { what, told } = envelopeOn(PLUCK, { curve: 'exponential' });
  what.set(['gate'], 1, { at: 5 });
  assert.deepEqual(told(1), [
    ['cancel', 5],
    ['set', SILENCE, 5],
    ['linear', 2, 5.25],
    ['exp', 1, 5.75],
  ]);
});

test("a trigger's gate closing passes it by, its stages running on", () => {
  const { what, told } = envelopeOn(PLUCK, { mode: 'trigger' });
  what.set(['gate'], 1, { at: 5 });
  what.set(['gate'], 0, { at: 6 });
  assert.deepEqual(told(1), OPENED);
});

test('a stage, its sustain or its amount changed as it sounds: drawn again from where it is then, a held level glided to; before its gate opens, kept for it', () => {
  const longer = envelopeOn();
  longer.what.set(['gate'], 1, { at: 5 });
  longer.what.set(['attack'], 0.5, { at: 5.125 });
  assert.deepEqual(longer.told(5), [
    ['cancel', 5.125],
    ['set', 1, 5.125],
    ['linear', 2, 5.5],
    ['linear', 1, 6],
  ]);
  const lower = envelopeOn();
  lower.what.set(['gate'], 1, { at: 5 });
  lower.what.set(['sustain'], 0.25, { at: 6 });
  assert.deepEqual(lower.told(5), [
    ['cancel', 6],
    ['set', 1, 6],
    ['target', 0.5, 6, SMOOTHING],
  ]);
  const kept = envelopeOn();
  kept.what.set(['amount'], 4, { at: 4.5 });
  assert.deepEqual(kept.told(1), [], 'nothing drawn before its gate opens');
  kept.what.set(['gate'], 1, { at: 5 });
  assert.deepEqual(kept.told(1)[2], ['linear', 4, 5.25]);
});

test('opened again: drawn from 0 again', () => {
  const { what, told } = envelopeOn();
  what.set(['gate'], 1, { at: 5 });
  what.set(['gate'], 1, { at: 7 });
  assert.deepEqual(told(5), [
    ['cancel', 7],
    ['set', 0, 7],
    ['linear', 2, 7.25],
    ['linear', 1, 7.75],
  ]);
});

// An envelope in Web Audio (mockup/src/libs/build/web-audio/blocks/envelope.ts), on the stand-in:
//   - a constant source, started as it's built, silent until its gate opens;
//   - its gate opened at a time: its curve drawn from 0 there, an ARP's (plan/blocks/envelope-curve.ts), by its amount;
//   - closed: a gate's released from where it is then; a trigger's running on;
//   - a stage, its sustain or its amount changed as it sounds: drawn again from where it is
//     then; before its gate opens, kept for it;
//   - opened again: drawn from 0 again;
//   - closed sooner than it was told: released from then;
//   - when it has faded for good, what's built says by its address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { oneBlockPlan } from './blocks.js';
import { eventTime, levelAt } from '../../../automation/index.ts';
import { SILENCE } from '../../../params/index.ts';
import { near } from '../../../util/test/near.js';

// a pluck's stages, its amount 2; times a float adds up exactly
const PLUCK = { attack: 0.25, decay: 0.5, sustain: 0.5, release: 0.25, amount: 2 };
// time constants an attack takes to charge to its peak, toward 1.3 times it; a decay or a release to settle
const CHARGED = Math.log(1.3 / (1.3 - 1));
const DONE = Math.log(1 / SILENCE);

// An envelope built at 4 s on a stand-in context:
// its constant source, and what its level is told from an event on.
function envelopeOn(values = PLUCK, settings = {}) {
  const context = new StandInContext(() => 4);
  const plan = oneBlockPlan('envelope', values, settings);
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
  });
  const [source] = context.rec.nodes.filter((node) => node.kind === 'constant');
  const told = (from) => source.offset.events.slice(from);
  return { context, what, source, told };
}
// what's built of a plan at 4 s on a stand-in context
function built(plan) {
  const context = new StandInContext(() => 4);
  return { what: new WebAudioBuilder({ context, beat: () => 0.5 }).build(plan, { into: context.destination }) };
}
// what its level is told as its gate opens at 5 s, a pluck's: charging past 2, cut there; settling onto 1
const OPENED = [
  ['cancel', 5],
  ['set', 0, 5],
  ['target', 2.6, 5, 0.25 / CHARGED],
  ['set', 2, 5.25],
  ['target', 1, 5.25, 0.5 / DONE],
];
// events as kinds and times, and what each is told, to a nanosecond: a value continued from where it is
const rounded = (events) =>
  events.map(([kind, ...rest]) => [kind, ...rest.map((value) => Math.round(value * 1e9) / 1e9)]);

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
  assert.deepEqual(rounded(told(6)), [
    ['cancel', 6],
    ['set', 1.000001, 6],
    ['target', 0, 6, rounded([['', 0.25 / DONE]])[0][1]],
  ]);
});

test("a trigger's gate closing passes it by, its stages running on", () => {
  const { what, told } = envelopeOn(PLUCK, { mode: 'trigger' });
  what.set(['gate'], 1, { at: 5 });
  what.set(['gate'], 0, { at: 6 });
  assert.deepEqual(told(1), OPENED);
});

test("a stage, its sustain or its amount changed as it sounds: drawn again from where it is then, an attack timed to reach its peak as it is cut, a sustain approached by its decay's time constant, as an analog's; before its gate opens, kept for it", () => {
  const longer = envelopeOn();
  longer.what.set(['gate'], 1, { at: 5 });
  longer.what.set(['attack'], 0.5, { at: 5.125 });
  const drawn = longer.told(6);
  assert.deepEqual(
    drawn.map((event) => [event[0], eventTime(event)]),
    [
      ['cancel', 5.125],
      ['set', 5.125],
      ['target', 5.125],
      ['set', 5.5],
      ['target', 5.5],
    ],
  );
  near(levelAt(drawn.slice(1, 3), 5.5), 2, 'at its peak as it is cut: nothing jumps');
  const lower = envelopeOn();
  lower.what.set(['gate'], 1, { at: 5 });
  lower.what.set(['sustain'], 0.25, { at: 6 });
  assert.deepEqual(lower.told(6).at(-1), ['target', 0.5, 6, 0.5 / DONE]);
  const kept = envelopeOn();
  kept.what.set(['amount'], 4, { at: 4.5 });
  assert.deepEqual(kept.told(1), [], 'nothing drawn before its gate opens');
  kept.what.set(['gate'], 1, { at: 5 });
  assert.deepEqual(kept.told(1)[2], ['target', 5.2, 5, 0.25 / CHARGED]);
});

test('opened again: drawn from 0 again', () => {
  const { what, told } = envelopeOn();
  what.set(['gate'], 1, { at: 5 });
  what.set(['gate'], 1, { at: 7 });
  assert.deepEqual(
    told(6),
    OPENED.map(([kind, ...rest]) => [
      kind,
      ...rest.map((value, index) => (index === 1 || kind === 'cancel' ? value + 2 : value)),
    ]),
  );
});

test('closed sooner than it was told, a note with no end closed at its longest and let go before it: released from then; told later, passed by', () => {
  const { what, told } = envelopeOn();
  what.set(['gate'], 1, { at: 5 });
  what.set(['gate'], 0, { at: 8 });
  what.set(['gate'], 0, { at: 6 });
  assert.deepEqual(
    told(9).map((event) => [event[0], eventTime(event)]),
    [
      ['cancel', 6],
      ['set', 6],
      ['target', 6],
    ],
  );
  what.set(['gate'], 0, { at: 7 });
  assert.equal(told(12).length, 0, 'closed already');
});

test("when it has faded for good, what's built says by its address: from the start before its gate opens; never while it holds a level; its release's end; a trigger's at its stages' end where they reach nothing", () => {
  const { what } = envelopeOn();
  assert.equal(what.faded([]), -Infinity);
  what.set(['gate'], 1, { at: 5 });
  assert.equal(what.faded([]), Infinity, 'held at its sustain');
  what.set(['gate'], 0, { at: 6 });
  near(
    what.faded([]),
    6 + (0.25 * Math.log(0.5 / SILENCE)) / DONE,
    'within the floor of silence of its amount: released from half of it, sooner than its release',
    1e-6,
  );
  const struck = envelopeOn({ ...PLUCK, sustain: 0 }, { mode: 'trigger' });
  struck.what.set(['gate'], 1, { at: 5 });
  near(struck.what.faded([]), 5.75, 'its decay from its top done at its time, whatever its amount');
  const swept = envelopeOn({ ...PLUCK, sustain: 0, amount: 21 }, { mode: 'trigger' });
  swept.what.set(['gate'], 1, { at: 5 });
  near(swept.what.faded([]), 5.75, 'a sweep of 21 semitones too');
  assert.throws(() => built(oneBlockPlan('gain')).what.faded([]), /no reading faded/);
});

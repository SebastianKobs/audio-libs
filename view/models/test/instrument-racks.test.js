// The instruments as the device view shows them (mockup/src/libs/view/models/instrument-racks.ts), in node, on instruments of
// the tests' own, a pluck's cards:
//   - a role's instrument a rack of its cards, a pad each, its status the patch it plays; none with no cards;
//   - its reset: every card of its patches put back, as the app's messages;
//   - the test note: its pitch and velocity, MIDI 1.0's at the edge, its own values from their defaults, the starts handed
//     in over them; pressed on a role's instrument while held, a little after now, let go as it's lifted, as the app's
//     messages;
//   - which of the note's own values a role's instrument reads, and which instruments read one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentRacks } from '../index.ts';
import { paramAt, settingAt } from '../../../plan/format/index.ts';
import { CARD } from '../../device/models/test/card.js';

// the pluck, and one with a rise of its own, as the note's sources' macros
const RISING = { ...CARD, node: { ...CARD.node, macros: [...CARD.node.macros, macro('rise')] } };
// the roles' instruments: a pluck playing on the tap, a drum rack's two pads on the hold, the trace with none
const PATCHES = { tap: 'pluck', hold: 'kit', trace: undefined };
const CARDS = {
  tap: [{ patch: 'pluck', planReadout: planReadoutOn(CARD), send: () => {} }],
  hold: [
    { patch: 'pluck', key: 36, planReadout: planReadoutOn(CARD), send: () => {} },
    { patch: 'swell', key: 38, planReadout: planReadoutOn(RISING), send: () => {} },
  ],
};

function macro(name) {
  return { spec: { name, range: [0, 1, 0.01] }, value: 0, maps: [] };
}
// a plan's readout of the tests' own onto a voice card: every value the plan's
function planReadoutOn(plan) {
  return {
    plan,
    valueOf: () => undefined,
    startOf: (address) => (paramAt(plan, address) ?? settingAt(plan, address))?.value,
    roleOf: () => ({ by: 'live' }),
    peakOf: () => 0,
    readingOf: () => 0,
    copiesOf: () => [],
    slotOf: () => undefined,
  };
}
// the racks on the tests' instruments, each message sent kept
function racksOn() {
  const sent = [];
  const clock = { t: 10, now: () => clock.t };
  const instrumentsReadout = { instruments: PATCHES, cardsOf: (role) => CARDS[role] ?? [] };
  const racks = new InstrumentRacks({
    instrumentsReadout,
    clock,
    send: (message) => sent.push(message),
    starts: { rise: 0.75 },
  });
  return { racks, sent, clock };
}

test("a role's instrument a rack of its cards, a pad each, by its key and its patch, its status the patch it plays; none with no cards", () => {
  const { racks } = racksOn();
  const tap = racks.rackOf('tap');
  assert.equal(tap.status, 'tap: pluck');
  assert.deepEqual(
    tap.pads.map(({ patch }) => patch),
    ['pluck'],
    'a patch alone',
  );
  assert.deepEqual(
    racks.rackOf('hold').pads.map(({ name, patch }) => [name, patch]),
    [
      ['36: pluck', 'pluck'],
      ['38: swell', 'swell'],
    ],
  );
  assert.equal(racks.rackOf('tap').pads[0].models, racks.rackOf('tap').pads[0].models, "a card's models made once");
  assert.equal(racks.rackOf('trace'), null);
});

test('its reset: every card of its patches put back, as the app asks it', () => {
  const { racks, sent } = racksOn();
  racks.reset('hold');
  assert.deepEqual(sent, [
    { type: 'preset reset', patch: 'pluck' },
    { type: 'preset reset', patch: 'swell' },
  ]);
});

test("the test note: MIDI 1.0's pitch and velocity at the edge, its own values from their defaults, the starts handed in over them; held from a little after now until it's lifted, as the app's messages", () => {
  const { racks, sent, clock } = racksOn();
  assert.deepEqual(racks.note, { pitch: 62, velocity: 127 });
  assert.equal(racks.values.rise, 0.75, 'a start handed in');
  assert.equal(racks.values.breath, 0, "the note's default");
  racks.note.velocity = 63.5;
  racks.press('tap');
  assert.deepEqual(sent, [
    { type: 'test note', key: 'tap', note: { pitch: 62, velocity: 0.5, t: 10.02, values: racks.values } },
  ]);
  assert.notEqual(sent[0].note.values, racks.values, 'its values as they were');
  clock.t = 12;
  racks.lift();
  racks.lift();
  assert.deepEqual(sent.slice(1), [{ type: 'test note released', key: 'tap', t: 12.02 }], 'let go once');
});

test("which of the note's own values a role's instrument reads; which instruments read one", () => {
  const { racks } = racksOn();
  assert.equal(racks.reads('tap', 'rise'), false);
  assert.equal(racks.reads('hold', 'rise'), true, 'a pad of its has it');
  assert.equal(racks.reads('trace', 'rise'), false);
  assert.deepEqual(racks.readersOf('rise'), ['kit']);
  assert.deepEqual(racks.readersOf('breath'), []);
});

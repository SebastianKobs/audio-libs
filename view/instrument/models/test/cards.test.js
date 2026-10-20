// The cards of an instrument (mockup/src/libs/view/instrument/models/cards.ts), as the device view edits them, on the tests' file of
// instruments (libs/plan/synth/test/pluck.js):
//   - a card for each patch an instrument plays: the patch alone, or a rack's pads, each its key;
//   - its preset on its voice card, read through a preset's readout: each value its preset's, values from outside over its own
//     where its card has them;
//   - how each is set: a note's source by the note, a value from outside by what it says, the rest live;
//   - a value or a setting set: sent as the app's message (SHAPE3b), the bank's preset changed by whoever hears it, the card
//     reading it; planned again as the bank's changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InstrumentCards } from '../index.ts';
import { instrumentsOf, LiveBank } from '../../../../plan/synth/index.ts';
import { MODULE_TEMPLATES } from '../../../../plan/synth/content.ts';
import { PLUCK_FILE } from '../../../../plan/synth/test/pluck.js';
import { cardModels } from '../../../device/models/test/card.js';

const INSTRUMENTS = instrumentsOf(PLUCK_FILE, 'pluck.yaml', MODULE_TEMPLATES);

// the cards on a live bank, each edit sent, then edited by the bank, as the studio's is
function cardsOn() {
  const bank = new LiveBank(INSTRUMENTS.patches);
  const sent = [];
  const send = (message) => {
    sent.push(message);
    bank.edit(message);
  };
  return { bank, sent, cards: new InstrumentCards({ instruments: INSTRUMENTS, bank, send }) };
}

test("a card for each patch an instrument plays: the patch alone; a rack's pads, each its key and its patch", () => {
  const { cards } = cardsOn();
  assert.deepEqual(
    cards.of('bright').map(({ patch, key }) => [patch, key]),
    [['bright', undefined]],
  );
  assert.deepEqual(
    cards.of('kit').map(({ patch, key }) => [patch, key]),
    [['bright', 38]],
  );
});

test("a card's values its preset's, those from outside over its own where its card has them; set by the note, by what the values say, else live", () => {
  const { cards } = cardsOn();
  const knobs = { values: () => ({ 'amp/decay': 0.7, release: 2 }), source: 'the panel' };
  const models = cardModels(cards.of('bright', knobs)[0]);
  assert.equal(models.control(['osc 1', 'tune']).value, 12, "its preset's");
  assert.deepEqual(models.control(['osc 1', 'tune']).role, { by: 'live' });
  assert.equal(models.control(['amp', 'decay']).value, 0.7, 'from outside, over its own');
  assert.deepEqual(models.control(['amp', 'decay']).role, { by: 'automated', source: 'the panel' });
  assert.deepEqual(models.control(['gate']).role, { by: 'automated', source: 'the note' });
  assert.equal(models.control(['release']), undefined, 'one its card has none of: not planned with it');
});

test("a value and a setting set on a card: sent as the app's messages, the bank's preset changed by whoever hears them, the card reading it; planned again as the bank's changes", () => {
  const { bank, sent, cards } = cardsOn();
  const models = cardModels(cards.of('rtlprnf')[0]);
  models.control(['osc 1', 'tune']).set(3);
  models.control(['osc 1', 'osc', 'wave']).choose('square');
  assert.deepEqual(sent, [
    { type: 'preset edited', patch: 'rtlprnf', of: 'values', address: ['osc 1', 'tune'], value: 3 },
    { type: 'preset edited', patch: 'rtlprnf', of: 'settings', address: ['osc 1', 'osc', 'wave'], value: 'square' },
  ]);
  const preset = bank.current('rtlprnf');
  assert.deepEqual(
    [preset.values['osc 1/tune'], preset.settings['osc 1/osc/wave']],
    [3, 'square'],
    "the bank's preset",
  );
  assert.equal(models.control(['osc 1', 'osc', 'wave']).value, 'square', 'the card reading it');
  bank.reset('rtlprnf');
  assert.equal(models.control(['osc 1', 'osc', 'wave']).value, 'triangle', 'planned again');
});

// A note map read from data at the edge (midi/note-map/loader.ts): its shape, its notes and its fallbacks checked, every problem said
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNoteMap } from '../index.ts';

// an example: a small drum kit, each case below spoiling a copy of it
function drumKit() {
  return {
    instruments: {
      snare: {
        articulations: {
          center: { variants: { right: { note: 38 }, either: { note: 38 } } },
          rimshot: { fallback: 'center', variants: { either: { note: 37, controller: { number: 4, value: 90 } } } },
        },
      },
      'snare 2': { fallback: 'snare', articulations: {} },
    },
  };
}
function refusalOf(data) {
  try {
    loadNoteMap(data, 'kit.json');
  } catch (error) {
    return error.message;
  }
  assert.fail('not refused');
}

test('a map of the shape, its notes in range and its fallbacks found, is taken', () => {
  assert.equal(loadNoteMap(drumKit(), 'kit.json').lookup('snare 2', 'rimshot', 'either').note, 37);
});

test('data read from JSON is taken as JSON.parse gives it', () => {
  const map = loadNoteMap(JSON.parse(JSON.stringify(drumKit())), 'kit.json');
  assert.equal(map.lookup('snare', 'center', 'right').note, 38);
});

test('unknown fields refused, at every level, a variant not one of right, left, either, up and down among them', () => {
  const kit = drumKit();
  kit.version = 2;
  kit.instruments.snare.colour = 'red';
  kit.instruments.snare.articulations.center.velocity = 1;
  kit.instruments.snare.articulations.center.variants.rigth = { note: 38 };
  kit.instruments.snare.articulations.rimshot.variants.either.channel = 9;
  const refusal = refusalOf(kit);
  assert.match(refusal, /^kit\.json: not of the shape of a note map:/);
  for (const field of ['version', 'colour', 'velocity', 'rigth', 'channel']) {
    assert.match(refusal, new RegExp(`its ${field} not one of its fields`), field);
  }
});

test('a field of the wrong kind, or a note with no note, refused', () => {
  const kit = drumKit();
  kit.instruments.snare.articulations.center.variants.right = { note: '38' };
  kit.instruments.snare.articulations.rimshot.variants.either = {};
  const refusal = refusalOf(kit);
  assert.match(refusal, /its note not a number/);
  assert.match(refusal, /no note/);
  assert.match(refusalOf([]), /not an object/);
});

test('notes and controller values outside 0 to 127, or not whole, refused, each where it is', () => {
  const kit = drumKit();
  kit.instruments.snare.articulations.center.variants.right.note = 128;
  kit.instruments.snare.articulations.center.variants.either.note = 37.5;
  kit.instruments.snare.articulations.rimshot.variants.either.controller = { number: -1, value: 200 };
  const refusal = refusalOf(kit);
  assert.match(refusal, /^kit\.json: not a usable note map:/);
  assert.match(
    refusal,
    /instruments snare articulations center variants right: its note is a whole number from 0 to 127, not 128/,
  );
  assert.match(refusal, /variants either: its note is a whole number from 0 to 127, not 37\.5/);
  assert.match(refusal, /rimshot variants either controller: its number is a whole number from 0 to 127, not -1/);
  assert.match(refusal, /rimshot variants either controller: its value is a whole number from 0 to 127, not 200/);
});

test('a fallback to an instrument or an articulation the map doesn’t have refused', () => {
  const kit = drumKit();
  kit.instruments['snare 2'].fallback = 'snare 3';
  kit.instruments.snare.articulations.rimshot.fallback = 'rim';
  const refusal = refusalOf(kit);
  assert.match(refusal, /instruments snare 2: its fallback, snare 3, names no instrument of the map/);
  assert.match(refusal, /instruments snare articulations rimshot: its fallback, rim, names no articulation of snare/);
});

test('fallbacks in a loop refused, each loop once, an instrument’s and an articulation’s, one falling back to itself too', () => {
  const kit = drumKit();
  kit.instruments.snare.fallback = 'snare 2';
  kit.instruments.snare.articulations.center.fallback = 'rimshot';
  kit.instruments.snare.articulations.flam = { fallback: 'flam' };
  const refusal = refusalOf(kit);
  const loops = refusal.split('\n').filter((line) => line.includes('loop'));
  assert.deepEqual(loops, [
    '  instruments fall back in a loop: snare → snare 2 → snare',
    '  instruments snare: its articulations fall back in a loop: center → rimshot → center',
    '  instruments snare: its articulations fall back in a loop: flam → flam',
  ]);
});

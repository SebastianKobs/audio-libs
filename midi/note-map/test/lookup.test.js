// A note looked up in a note map (midi/note-map/note-map.ts): instrument → articulation → variant → a MIDI note, and the fallbacks taken.
// The maps here are examples: a drum kit's, as a drum sampler maps it, and a strummed instrument's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNoteMap } from '../index.ts';

// an example: a drum kit
const DRUM_KIT = {
  instruments: {
    snare: {
      articulations: {
        center: { variants: { right: { note: 38 }, left: { note: 40 }, either: { note: 38 } } },
        rimshot: { fallback: 'center' },
        ghost: { fallback: 'soft' },
        soft: { fallback: 'center', variants: { right: { note: 37 } } },
      },
    },
    'snare 2': { fallback: 'snare', articulations: { flam: { variants: { either: { note: 31 } } } } },
    'hi-hat': {
      articulations: {
        closed: { variants: { either: { note: 42, controller: { number: 4, value: 127 } } } },
        open: { variants: { either: { note: 46, controller: { number: 4, value: 0 } } } },
      },
    },
  },
};
// an example: a strummed instrument, its variants a direction
const STRUMS = {
  instruments: { guitar: { articulations: { strum: { variants: { up: { note: 61 }, down: { note: 60 } } } } } },
};

test('found where it’s asked: the note, and where it was found, no fallback taken', () => {
  const map = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  assert.deepEqual(map.lookup('snare', 'center', 'left'), {
    note: 40,
    instrument: 'snare',
    articulation: 'center',
    variant: 'left',
    fallbacks: [],
  });
  assert.equal(loadNoteMap(STRUMS, 'strums.json').lookup('guitar', 'strum', 'up').note, 61, 'a direction');
});

test('a controller value sent with its note, where the map gives one', () => {
  const map = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  const open = map.lookup('hi-hat', 'open', 'either');
  assert.equal(open.note, 46);
  assert.deepEqual(open.controller, { number: 4, value: 0 });
  assert.equal('controller' in map.lookup('snare', 'center', 'right'), false, 'none where it gives none');
});

test('a variant falls back to either; no variant asked for is either', () => {
  const kit = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  assert.deepEqual(kit.lookup('hi-hat', 'closed', 'right'), {
    note: 42,
    controller: { number: 4, value: 127 },
    instrument: 'hi-hat',
    articulation: 'closed',
    variant: 'either',
    fallbacks: [{ level: 'variant', from: 'right', to: 'either' }],
  });
  assert.deepEqual(kit.lookup('hi-hat', 'closed').fallbacks, []);
});

test('an articulation falls back along its chain, each variant tried at each step', () => {
  const map = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  const rimshot = map.lookup('snare', 'rimshot', 'right');
  assert.equal(rimshot.note, 38);
  assert.deepEqual(rimshot.fallbacks, [{ level: 'articulation', from: 'rimshot', to: 'center' }]);
  const ghost = map.lookup('snare', 'ghost', 'right');
  assert.equal(ghost.note, 37, 'soft has a right hand');
  assert.deepEqual(ghost.fallbacks, [{ level: 'articulation', from: 'ghost', to: 'soft' }]);
  const leftGhost = map.lookup('snare', 'ghost', 'left');
  assert.equal(leftGhost.note, 40, 'soft has no left, nor an either: on to center');
  assert.deepEqual(leftGhost.fallbacks, [
    { level: 'articulation', from: 'ghost', to: 'soft' },
    { level: 'articulation', from: 'soft', to: 'center' },
  ]);
});

test('an instrument falls back to another once its own articulations give nothing: instrument first, then articulation, then variant', () => {
  const map = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  assert.equal(map.lookup('snare 2', 'flam', 'left').note, 31, 'its own first');
  assert.deepEqual(map.lookup('snare 2', 'rimshot', 'up'), {
    note: 38,
    instrument: 'snare',
    articulation: 'center',
    variant: 'either',
    fallbacks: [
      { level: 'instrument', from: 'snare 2', to: 'snare' },
      { level: 'articulation', from: 'rimshot', to: 'center' },
      { level: 'variant', from: 'up', to: 'either' },
    ],
  });
});

test('nothing found: an unknown instrument, an articulation no instrument in the chain has, a variant with no either', () => {
  const map = loadNoteMap(DRUM_KIT, 'drum-kit.json');
  assert.equal(map.lookup('cowbell', 'center', 'right'), undefined);
  assert.equal(map.lookup('hi-hat', 'pedal', 'either'), undefined);
  assert.equal(loadNoteMap(STRUMS, 'strums.json').lookup('guitar', 'strum', 'either'), undefined);
});

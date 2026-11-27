// A place swung within pairs of halves, and back (base/util/swing.ts): the second half of each pair starts late by a share of a half
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swung, unswung } from '../index.ts';
import { near } from './near.js';

test('a triplet swing, late by a third of a half: the second half starts at 4/3, the pair still ends on 2', () => {
  const triplet = 1 / 3;
  near(swung(1, 1, triplet), 4 / 3, 'the second half');
  near(swung(0.5, 1, triplet), 2 / 3, 'halfway into the first half, stretched');
  near(swung(1.5, 1, triplet), 4 / 3 + 0.5 * (2 / 3), 'halfway into the second half, squeezed');
  near(swung(2, 1, triplet), 2, 'the next pair starts where it would');
  near(swung(3, 1, triplet), 2 + 4 / 3, 'the next pair swung the same');
});

test('a pair of any length: halves of a half, late by a half, the second at three quarters', () => {
  near(swung(0.5, 0.5, 0.5), 0.75);
  near(swung(1.5, 0.5, 0.5), 1.75);
  near(swung(1, 0.5, 0.5), 1, 'a pair’s start stays');
});

test('late 0 leaves every place where it is', () => {
  for (const place of [0, 0.3, 1, 1.7, 5]) {
    assert.equal(swung(place, 1, 0), place);
    assert.equal(unswung(place, 1, 0), place);
  }
});

test('unswung undoes swung, on and between the halves', () => {
  for (const late of [1 / 3, 0.5, 0.6]) {
    for (const place of [0, 0.25, 0.5, 0.9, 1, 1.25, 2.5, 7.75]) {
      near(unswung(swung(place, 0.5, late), 0.5, late), place, `late ${late}, place ${place}`);
    }
  }
});

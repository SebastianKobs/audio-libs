// The contact law's unit tests (dsp/modal/): a Hunt-Crossley law with a preload, its force, potential, mean slope
// over a step, and damping, against each other and against the formulas. No audio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContactLaw } from '../index.ts';

const STIFFNESS = 1e8;
const EXPONENT = 1.5;
const near = (actual, expected, relative, message) =>
  assert.ok(Math.abs(actual - expected) <= relative * Math.abs(expected), `${message}: ${actual} against ${expected}`);

test('without a preload, no force apart, and k·y^α pressed in', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT });
  assert.equal(law.force(-1e-3), 0);
  assert.equal(law.potential(-1e-3), 0);
  near(law.force(1e-3), STIFFNESS * 1e-3 ** EXPONENT, 1e-12, 'pressed');
});

test('with a preload, no force at rest, and the preload pulling once the contact opens', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  near(law.restPenetration, (2 / STIFFNESS) ** (1 / EXPONENT), 1e-12, 'pressed in at rest');
  assert.ok(Math.abs(law.force(0)) < 1e-12, 'at rest');
  assert.equal(law.potential(0), 0, 'its potential measured from rest');
  assert.equal(law.force(-1), -2, 'opened');
});

test('the force is the slope of the potential', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  const step = 1e-9;
  for (const y of [-1e-4, -1e-5, 0, 1e-5, 1e-4]) {
    const slope = (law.potential(y + step) - law.potential(y - step)) / (2 * step);
    // against the preload's size too: at rest the force is 0, and a relative error of nothing fails on rounding
    const error = Math.abs(slope - law.force(y));
    assert.ok(error <= 1e-5 * (Math.abs(law.force(y)) + 2), `at ${y}: ${slope} against ${law.force(y)}`);
  }
});

test("the mean force over a step is the potential's change over it, the force itself over no step", () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  const mean = (law.potential(3e-5) - law.potential(-2e-5)) / 5e-5;
  near(law.averageForce(-2e-5, 3e-5), mean, 1e-9, 'over a step');
  near(law.averageForce(1e-5, 1e-5), law.force(1e-5), 1e-12, 'over none');
});

test('the slope of the mean force by where the step ends, over a step and over almost none', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  const step = 1e-11;
  for (const [from, to] of [
    [-2e-5, 3e-5],
    [1e-5, 1e-5 + 1e-14],
  ]) {
    const slope = (law.averageForce(from, to + step) - law.averageForce(from, to - step)) / (2 * step);
    near(law.averageForceSlope(from, to), slope, 1e-3, `from ${from} to ${to}`);
  }
});

test('damping grows with how hard the contact is pressed, none apart', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, damping: 50, preload: 2 });
  assert.equal(law.dampingAt(-1), 0);
  near(law.dampingAt(1e-5), 50 * (law.restPenetration + 1e-5) ** EXPONENT, 1e-12, 'pressed');
});

test('the mean force and its slope written in one call', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  const into = { force: 0, slope: 0 };
  assert.equal(law.meanForceInto(-2e-5, 3e-5, into), into, 'written into the one handed in');
  near(into.force, law.averageForce(-2e-5, 3e-5), 1e-12, 'the force');
  near(into.slope, law.averageForceSlope(-2e-5, 3e-5), 1e-12, 'the slope');
});

test('open where the parts no longer touch, past the rest penetration', () => {
  const law = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  assert.equal(law.isOpen(0), false, 'at rest, pressed together');
  assert.equal(law.isOpen(-law.restPenetration / 2), false, 'lifted a little');
  assert.equal(law.isOpen(-law.restPenetration * 1.01), true, 'lifted past it');
});

test('the slope of the mean force stays true over a step far shorter than the rest penetration', () => {
  // a stiff bridge under a large preload: rest penetration 0.024, a step of 10⁻¹⁰ near rest; a linear law's
  // mean force rises by half its stiffness per unit of where the step ends
  const linear = new ContactLaw({ stiffness: 2.45e8, exponent: 1, preload: 5.8e6 });
  const from = -4.4803e-6;
  near(linear.averageForceSlope(from, from + 1e-10), 2.45e8 / 2, 1e-6, 'linear');
  near(linear.averageForce(from, from + 1e-10), linear.force(from + 5e-11), 1e-9, 'its mean force');
  const curved = new ContactLaw({ stiffness: STIFFNESS, exponent: EXPONENT, preload: 2 });
  const stiffnessThere = STIFFNESS * EXPONENT * (curved.restPenetration + 1e-6) ** (EXPONENT - 1);
  near(curved.averageForceSlope(1e-6, 1e-6 + 1e-13), stiffnessThere / 2, 1e-6, 'a power of 1.5');
});

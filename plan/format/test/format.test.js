// The plan format's unit tests (mockup/src/libs/plan/format):
//   - a plan is data, stored as JSON: its examples read back as they were (test/plans.ts, held to the format by the type check);
//   - a stored plan's version: this format's, or refused, naming what was found.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSION, versionOf } from '../index.ts';
import { SYNTH, UTILITY } from './plans.ts';

test('a plan is data, stored as JSON: an effect and an instrument read back from their JSON as they were, their version read', () => {
  for (const plan of [UTILITY, SYNTH]) {
    const stored = JSON.parse(JSON.stringify(plan));
    assert.deepEqual(stored, plan);
    assert.equal(versionOf(stored), VERSION);
  }
});

test("a stored plan's version: this format's, 1; one with none, one that isn't a whole number, or a newer one refused, naming what it found", () => {
  assert.equal(VERSION, 1);
  assert.equal(versionOf({ version: 1, node: {} }), 1);
  assert.throws(() => versionOf({ node: {} }), /found none/);
  assert.throws(() => versionOf('a plan'), /found none/, 'no plan at all');
  assert.throws(() => versionOf({ version: '1' }), /found "1"/);
  assert.throws(() => versionOf({ version: 1.5 }), /found 1\.5/);
  assert.throws(() => versionOf({ version: 2 }), /2 is newer than this format's, 1/);
});

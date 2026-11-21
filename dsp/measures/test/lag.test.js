// The lag reader's unit tests (dsp/measures/): how late a click comes back, in samples, read off the
// loudest sample after where it went in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lagOf } from '../index.ts';

test('the lag a click comes back late by: the samples from where it went in to its loudest', () => {
  const heard = new Float32Array(512);
  heard[100 + 192] = 0.4;
  heard[100 + 190] = -0.1;
  assert.equal(lagOf(heard, 100), 192);
  assert.equal(lagOf(new Float32Array(512), 100), 0, 'nothing heard: none');
});

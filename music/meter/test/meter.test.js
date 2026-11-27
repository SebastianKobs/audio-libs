// A meter from its grouping (music/meter/meter.ts): a bar's length in beats, a beat a quarter note, its groups' starts and its pulses
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barBeats, groupStarts, meterOf, pulses } from '../index.ts';

test('3+2+2 in 8ths: a bar of 3.5 beats, its groups starting on 0, 1.5 and 2.5', () => {
  const meter = meterOf('3+2+2', 8);
  assert.deepEqual(meter, { groups: [3, 2, 2], unit: 8 });
  assert.equal(barBeats(meter), 3.5);
  assert.deepEqual(groupStarts(meter), [0, 1.5, 2.5]);
});

test('its pulses, an 8th each: the one weighs 2, each other group’s start 1, the rest 0', () => {
  const meter = meterOf('3+2+2', 8);
  assert.deepEqual(
    pulses(meter).map(({ at, weight }) => [at, weight]),
    [
      [0, 2],
      [0.5, 0],
      [1, 0],
      [1.5, 1],
      [2, 0],
      [2.5, 1],
      [3, 0],
    ],
  );
});

test('4 in quarters: a bar of 4 beats, one group, only the one strong', () => {
  const meter = meterOf('4', 4);
  assert.equal(barBeats(meter), 4);
  assert.deepEqual(groupStarts(meter), [0]);
  assert.deepEqual(
    pulses(meter).map(({ weight }) => weight),
    [2, 0, 0, 0],
  );
});

test('2+2+3 in 16ths: a bar of 7 16ths, 1.75 beats, its groups on 0, 0.5 and 1', () => {
  const meter = meterOf('2+2+3', 16);
  assert.equal(barBeats(meter), 1.75);
  assert.deepEqual(groupStarts(meter), [0, 0.5, 1]);
  assert.equal(pulses(meter).length, 7);
});

test('spaces around the plus signs are let be', () => {
  assert.deepEqual(meterOf(' 3 + 3 + 2 ', 8).groups, [3, 3, 2]);
});

test('a grouping that isn’t whole numbers joined by +, or a unit that isn’t a note value, is refused, saying what it got', () => {
  for (const grouping of ['', '3++2', '3+x', '2.5+2', '0+2', '+3']) {
    assert.throws(() => meterOf(grouping, 8), /grouping is whole numbers above 0 joined by \+/, grouping);
  }
  for (const unit of [0, 3, 6, 128, 0.5]) {
    assert.throws(() => meterOf('4', unit), /unit is a note value, 1, 2, 4 … 64, not/, String(unit));
  }
});

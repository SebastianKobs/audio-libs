// The mode bank's unit tests (dsp/modal/): modes that ring at their frequencies and decay in their times,
// pushed by forces at points and read at points, their energy kept without damping. No audio: the samples read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModeBank } from '../index.ts';

const RATE = 48000;

// the positions at a point, a sample each, after one push at another
function struck(bank, { at = 0, read = 0, samples = RATE } = {}) {
  bank.push(at, 1);
  bank.advance();
  const positions = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    positions[i] = bank.position(read);
    bank.advance();
  }
  return positions;
}

// the frequency from the first to the last upward zero crossing, each placed between its samples by a straight line
function frequencyOf(samples) {
  const crossings = [];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) {
      crossings.push(i - 1 + samples[i - 1] / (samples[i - 1] - samples[i]));
    }
  }
  return ((crossings.length - 1) * RATE) / (crossings.at(-1) - crossings[0]);
}

function peak(samples, from, to) {
  let most = 0;
  for (let i = from; i < to; i++) {
    most = Math.max(most, Math.abs(samples[i]));
  }
  return most;
}

test('a mode rings at its frequency', () => {
  const bank = new ModeBank([{ frequency: 440, decayTime: 4, shape: [1] }], RATE);
  const frequency = frequencyOf(struck(bank));
  assert.ok(Math.abs(frequency - 440) < 0.01, `rang at ${frequency.toFixed(3)} Hz`);
});

test('a mode falls 60 dB in its decay time', () => {
  const bank = new ModeBank([{ frequency: 440, decayTime: 0.5, shape: [1] }], RATE);
  const positions = struck(bank);
  const period = Math.ceil(RATE / 440);
  const fall = 20 * Math.log10(peak(positions, RATE / 2, RATE / 2 + period) / peak(positions, 0, period));
  assert.ok(Math.abs(fall + 60) < 0.1, `fell ${fall.toFixed(2)} dB`);
});

test('without damping, a mode keeps its energy; with it, the energy never rises', () => {
  const kept = new ModeBank([{ frequency: 262, decayTime: Infinity, shape: [1] }], RATE);
  kept.push(0, 1);
  kept.advance();
  const start = kept.energy();
  assert.ok(start > 0, 'struck, it has energy');
  for (let i = 0; i < RATE; i++) {
    kept.advance();
  }
  assert.ok(Math.abs(kept.energy() / start - 1) < 1e-9, 'kept for a second');

  const damped = new ModeBank([{ frequency: 262, decayTime: 1, shape: [1] }], RATE);
  damped.push(0, 1);
  damped.advance();
  let before = damped.energy();
  for (let i = 0; i < RATE; i++) {
    damped.advance();
    assert.ok(damped.energy() <= before, `rose at sample ${i}`);
    before = damped.energy();
  }
});

test('a point moves by the sum of the modes, each by its shape there', () => {
  const bank = new ModeBank(
    [
      { frequency: 262, decayTime: 2, shape: [1, 0.5] },
      { frequency: 1703, decayTime: 0.5, shape: [-0.8, 1] },
    ],
    RATE,
  );
  const atTip = struck(bank, { at: 0, read: 0, samples: 200 });
  const atBridge = struck(new ModeBank(bank.modes, RATE), { at: 0, read: 1, samples: 200 });
  const oneMode = (index, point) =>
    struck(new ModeBank([bank.modes[index]], RATE), { at: 0, read: point, samples: 200 });
  const tipSum = oneMode(0, 0).map((x, i) => x + oneMode(1, 0)[i]);
  const bridgeSum = oneMode(0, 1).map((x, i) => x + oneMode(1, 1)[i]);
  for (let i = 0; i < 200; i++) {
    assert.ok(Math.abs(atTip[i] - tipSum[i]) < 1e-15, `the tip at sample ${i}`);
    assert.ok(Math.abs(atBridge[i] - bridgeSum[i]) < 1e-15, `the bridge at sample ${i}`);
  }
});

test('a force moves a point at the next sample by its compliance, on top of where it was going', () => {
  const bank = new ModeBank(
    [
      { frequency: 262, decayTime: 2, shape: [1, 0.5] },
      { frequency: 1703, decayTime: 0.5, shape: [-0.8, 1] },
    ],
    RATE,
  );
  struck(bank, { samples: 100 });
  assert.equal(bank.compliance(0, 1), bank.compliance(1, 0), 'the same either way');
  const free = bank.freePosition(1);
  bank.advance([0.3, 0]);
  const expected = free + 0.3 * bank.compliance(0, 1);
  assert.ok(Math.abs(bank.position(1) - expected) < 1e-12 * Math.abs(expected), 'a force handed to advance()');

  const free2 = bank.freePosition(1);
  bank.push(0, 0.3);
  assert.ok(Math.abs(bank.freePosition(1) - (free2 + 0.3 * bank.compliance(0, 1))) < 1e-18, 'a pushed force counts');
});

test('a mode at or above half the sample rate is left out: it would alias', () => {
  const bank = new ModeBank([{ frequency: 30000, decayTime: 1, shape: [1] }], RATE);
  assert.equal(bank.modes.length, 0);
  assert.equal(peak(struck(bank, { samples: 100 }), 0, 100), 0);
  assert.equal(bank.energy(), 0);
});

test("a bank's state handed to another goes on as the first would have", () => {
  const modes = [
    { frequency: 262, decayTime: 2, shape: [1, 0.5] },
    { frequency: 1703, decayTime: 0.5, shape: [-0.8, 1] },
  ];
  const first = new ModeBank(modes, RATE);
  struck(first, { samples: 100 });
  const second = new ModeBank(modes, RATE);
  modes.forEach((_, mode) => second.setState(mode, first.state(mode)));
  for (let i = 0; i < 1000; i++) {
    assert.equal(second.position(1), first.position(1), `at sample ${i}`);
    first.advance();
    second.advance();
  }
});

test("a mode's state is its displacement now and a sample before", () => {
  const bank = new ModeBank([{ frequency: 262, decayTime: 2, shape: [2] }], RATE);
  bank.setState(0, { now: 0.25, before: 0.2 });
  assert.deepEqual(bank.state(0), { now: 0.25, before: 0.2 });
  assert.equal(bank.position(0), 0.5, 'the point by its shape');
  const free = bank.freePosition(0);
  bank.advance();
  assert.equal(bank.position(0), free, 'the next sample from it, as the free position said');
});

// The PNP stage's unit tests (dsp/circuits/): a one-transistor circuit run sample by sample, its transistor solved
// by damped Newton at each sample, started at its DC operating point. Checked against ngspice-42 on the Rangemaster
// with the OC44 as Ebers-Moll, at 22.765313 °C so its kT/q is 25.5 mV (run by hand, 2026-11-21).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OC44_EBERS_MOLL, PnpStage, RANGEMASTER } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 384000; // 8 × 48 kHz, as the drive will run it: the bilinear warp at 1 kHz far under the tolerance
const SUPPLY = -9;
const stage = () => new PnpStage(RANGEMASTER, OC44_EBERS_MOLL, RATE, SUPPLY);

test('starts at the operating point ngspice finds for the same circuit and values', () => {
  const { junctions } = stage();
  near(junctions[0], 0.12792667321469, 'Veb', 1e-9);
  near(junctions[1], 5.8137657903442, 'Vec', 1e-8); // ngspice's own RELTOL, 1e-9 of 5.8 V
});

test('silence stays silent and at the operating point: nothing to settle', () => {
  const rangemaster = stage();
  for (let n = 0; n < RATE / 10; n++) {
    near(rangemaster.process(0), 0, `sample ${n}`, 1e-9);
  }
  near(rangemaster.junctions[0], 0.12792667321469, 'Veb', 1e-9);
});

test('a quiet sine at 1 kHz gets the small-signal gain ngspice finds there, +27.84 dB', () => {
  // ngspice's AC analysis of the same circuit: 27.83806 dB at 1 kHz
  const rangemaster = stage();
  const [hz, level] = [1000, 1e-3];
  const settle = RATE / 20; // C3 into 1 MΩ: 10 ms
  const periods = 50;
  const length = (periods * RATE) / hz;
  let [sine, cosine] = [0, 0];
  for (let n = 0; n < settle + length; n++) {
    const phase = (2 * Math.PI * hz * n) / RATE;
    const output = rangemaster.process(level * Math.sin(phase));
    if (n >= settle) {
      sine += output * Math.sin(phase);
      cosine += output * Math.cos(phase);
    }
  }
  const amplitude = (2 * Math.hypot(sine, cosine)) / length;
  near(20 * Math.log10(amplitude / level), 27.83806, 'gain in dB', 0.02);
});

test('a square far past full scale never stalls the solve nor leaves numbers', () => {
  const rangemaster = stage();
  for (let n = 0; n < RATE / 20; n++) {
    const output = rangemaster.process(Math.sin((2 * Math.PI * 1000 * n) / RATE) >= 0 ? 5 : -5);
    assert.ok(Number.isFinite(output), `sample ${n}: ${output}`);
  }
  assert.equal(rangemaster.stalls, 0);
});

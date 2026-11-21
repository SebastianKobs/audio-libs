// The Rangemaster against its test vectors (dsp/circuits/, test-vectors/circuits/rangemaster.json): the papers' sines
// through the stage as written once, after the stage was compared with ngspice-42 by hand. A change here is a change
// in how the circuit sounds: the vectors are written again only on purpose (tools/make-circuit-vectors.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OC44_EBERS_MOLL, OC44_PARASITICS, PnpStage, RANGEMASTER, withParasitics } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const vectors = JSON.parse(
  readFileSync(new URL('../../../test-vectors/circuits/rangemaster.json', import.meta.url), 'utf8'),
);
const RATE = 384000;
const SECONDS = 0.1;
const WITHIN = 1e-8; // V: the vectors' 10 digits, and a last bit of Math.exp that may differ between engines

test('the papers’ sines come out of the Rangemaster, plain and with its parasitics, as the vectors have them: the last period and its harmonics', () => {
  assert.equal(vectors.format, 1);
  for (const { parasitics, level, hz, points, harmonics } of vectors.cases) {
    const netlist = parasitics ? withParasitics(RANGEMASTER, OC44_PARASITICS) : RANGEMASTER;
    const stage = new PnpStage(netlist, OC44_EBERS_MOLL, RATE, -9);
    const which = `${parasitics ? 'with' : 'without'} parasitics, ${level} V ${hz} Hz`;
    const length = Math.round(SECONDS * RATE);
    const output = new Float64Array(length);
    for (let n = 0; n < length; n++) {
      output[n] = stage.process(level * Math.sin((2 * Math.PI * hz * n) / RATE));
    }
    const period = RATE / hz;
    const last = output.subarray(length - period);
    points.forEach((expected, k) => {
      near(last[Math.floor((k * period) / points.length)], expected, `${which}, point ${k}`, WITHIN);
    });
    harmonics.forEach((expected, k) => {
      near(amplitude(last, k + 1), expected, `${which}, harmonic ${k + 1}`, WITHIN);
    });
  }
});

function amplitude(period, harmonic) {
  let [sine, cosine] = [0, 0];
  period.forEach((value, i) => {
    const phase = (2 * Math.PI * harmonic * i) / period.length;
    sine += value * Math.sin(phase);
    cosine += value * Math.cos(phase);
  });
  return (2 * Math.hypot(sine, cosine)) / period.length;
}

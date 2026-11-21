// The DK model's unit tests (dsp/circuits/): a netlist made a state-space model, each capacitor by the trapezoidal rule.
// Checked on circuits whose answers are known: a divider, an RC lowpass against the bilinear recursion it must equal,
// and the Rangemaster's parts around the transistor, its currents held at ngspice-42's operating point (2026-11-21).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DkModel, RANGEMASTER } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const NO_CURRENTS = new Float64Array(0);

test('a divider passes its share at once, nothing to remember', () => {
  const divider = new DkModel(
    {
      resistors: [
        { between: ['in', 'out'], ohms: 3000 },
        { between: ['out', 'ground'], ohms: 1000 },
      ],
      capacitors: [],
      sources: [['in', 'ground']],
      transistors: [],
      output: ['out', 'ground'],
    },
    RATE,
  );
  divider.knownVoltages([2]);
  near(divider.advance([2], NO_CURRENTS), 0.5);
});

test('an RC lowpass answers a step as the bilinear transform of 1 / (1 + sRC) does, sample for sample', () => {
  const [ohms, farads] = [1000, 1e-6];
  const lowpass = new DkModel(
    {
      resistors: [{ between: ['in', 'out'], ohms }],
      capacitors: [{ between: ['out', 'ground'], farads }],
      sources: [['in', 'ground']],
      transistors: [],
      output: ['out', 'ground'],
    },
    RATE,
  );
  const half = 1 / (2 * RATE * ohms * farads); // T / 2RC
  const [gain, pole] = [half / (1 + half), (1 - half) / (1 + half)];
  let [expected, last] = [0, 0];
  for (let n = 0; n < 200; n++) {
    lowpass.knownVoltages([1]);
    expected = gain * (1 + last) + pole * expected;
    last = 1;
    near(lowpass.advance([1], NO_CURRENTS), expected, `sample ${n}`, 1e-12);
  }
});

test('the Rangemaster’s parts, its transistor’s currents held where ngspice found them, settle at ngspice’s junction voltages', () => {
  // ngspice at 22.765313 °C, 13 digits: Veb 0.12792667321469 V, Vec 5.8137657903442 V, the collector at
  // -6.712960631929 V through the 10 kΩ load, the emitter current 0.23056277989344 mA
  const collector = (9 - 6.712960631929) / 10e3;
  const currents = new Float64Array([0.23056277989344e-3 - collector, collector]); // base, collector
  const stage = new DkModel(RANGEMASTER, RATE);
  const inputs = [0, -9]; // no signal, the supply
  let junctions = new Float64Array(2);
  for (let n = 0; n < 4 * RATE; n++) {
    junctions = stage.knownVoltages(inputs).slice(); // with the currents fixed, the voltages are known outright
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        junctions[i] += stage.feedback[i * 2 + j] * currents[j];
      }
    }
    stage.advance(inputs, currents);
  }
  near(junctions[0], 0.12792667321469, 'Veb', 1e-7);
  near(junctions[1], 5.8137657903442, 'Vec', 1e-7);
});

test('feeds a transistor’s two currents back onto its two junction voltages: a 2 × 2 matrix', () => {
  assert.equal(new DkModel(RANGEMASTER, RATE).feedback.length, 4);
});

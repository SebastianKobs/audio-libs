// The parasitics' unit tests (dsp/circuits/): a transistor's base resistance and junction capacitances added to a
// netlist around it, and the Rangemaster with the OC44's against ngspice-42's AC analysis of the same model
// (CJE 410 pF, CJC 10 pF, constant; RB 32.83 Ω; at 22.765313 °C, by hand on 2026-11-21).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OC44_EBERS_MOLL, OC44_PARASITICS, PnpStage, RANGEMASTER, withParasitics } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 384000;

test('puts the transistor’s base behind its base resistance, each junction’s capacitance across it', () => {
  const netlist = withParasitics(RANGEMASTER, OC44_PARASITICS);
  const [transistor] = netlist.transistors;
  const inside = transistor.base;
  assert.notEqual(inside, 'base');
  assert.deepEqual(transistor, { emitter: 'emitter', base: inside, collector: 'collector' });
  assert.deepEqual(netlist.resistors.at(-1), { between: ['base', inside], ohms: 32.83 });
  assert.deepEqual(netlist.capacitors.slice(-2), [
    { between: ['emitter', inside], farads: 410e-12 },
    { between: ['collector', inside], farads: 10e-12 },
  ]);
  assert.equal(netlist.resistors.length, RANGEMASTER.resistors.length + 1);
});

test('with them the Rangemaster’s quiet gain is ngspice’s: 27.61 dB at 1 kHz, 36.22 dB at 14 kHz, 2 dB under the plain model’s', () => {
  const netlist = withParasitics(RANGEMASTER, OC44_PARASITICS);
  near(quietGain(netlist, 1000), 27.6119129, 'at 1 kHz', 0.02);
  near(quietGain(netlist, 14000), 36.2220963, 'at 14 kHz', 0.05); // the bilinear warp, 0.4 % at 14 kHz, on a flat top
});

function quietGain(netlist, hz) {
  const stage = new PnpStage(netlist, OC44_EBERS_MOLL, RATE, -9);
  const level = 1e-4;
  const settle = RATE / 20;
  const length = Math.round((RATE / hz) * Math.round(hz / 20)); // whole periods, about 50 ms
  let [sine, cosine] = [0, 0];
  for (let n = 0; n < settle + length; n++) {
    const phase = (2 * Math.PI * hz * n) / RATE;
    const output = stage.process(level * Math.sin(phase));
    if (n >= settle) {
      sine += output * Math.sin(phase);
      cosine += output * Math.cos(phase);
    }
  }
  return 20 * Math.log10((2 * Math.hypot(sine, cosine)) / length / level);
}

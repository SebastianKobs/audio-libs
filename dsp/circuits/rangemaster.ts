// ---------- dsp/circuits/rangemaster: the Dallas Rangemaster Treble Booster's circuit, as a netlist ----------
import type { Netlist } from './dk-model.ts';

/**
 * The Dallas Rangemaster (London, about 1966): one PNP transistor as a common-emitter stage on -9 V, its nominal
 * parts (Holmes and van Walstijn, DAFx-16, Table 1), its Set potentiometer at full, the supply's bypass capacitor
 * left out (with a steady supply it does nothing). A treble booster: its input and output capacitors make a
 * highpass, about 30 dB more gain at 10 kHz than at 100 Hz.
 * Inputs: the signal, then the supply (-9 V). Output: the voltage across its 1 MΩ load.
 */
export const RANGEMASTER: Netlist = Object.freeze({
  resistors: [
    { between: ['base', 'supply'], ohms: 470e3 },
    { between: ['base', 'ground'], ohms: 68e3 },
    { between: ['emitter', 'ground'], ohms: 3.9e3 },
    { between: ['collector', 'supply'], ohms: 10e3 }, // the Set potentiometer, at full
    { between: ['output', 'ground'], ohms: 1e6 },
  ],
  capacitors: [
    { between: ['input', 'base'], farads: 4.7e-9 },
    { between: ['emitter', 'ground'], farads: 47e-6 }, // the emitter's bypass
    { between: ['collector', 'output'], farads: 10e-9 },
  ],
  sources: [
    ['input', 'ground'],
    ['supply', 'ground'],
  ],
  transistors: [{ emitter: 'emitter', base: 'base', collector: 'collector' }],
  output: ['output', 'ground'],
} as const);

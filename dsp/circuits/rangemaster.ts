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

/**
 * The Rangemaster with its input and output capacitors 100 times larger (470 nF, 1 µF): flat within 1 dB from 200 Hz,
 * the transistor, its bias and its gain as built. Its emitter's bypass is kept, for its bias's time: it takes 1.3 dB
 * off 100 Hz. A choice outside its papers, for a sound with as much in its lows as in its highs.
 */
export const RANGEMASTER_FULL_RANGE: Netlist = Object.freeze({
  ...RANGEMASTER,
  capacitors: [
    { between: ['input', 'base'], farads: 470e-9 },
    { between: ['emitter', 'ground'], farads: 47e-6 },
    { between: ['collector', 'output'], farads: 1e-6 },
  ],
} as const);

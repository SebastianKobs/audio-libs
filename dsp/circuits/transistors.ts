// ---------- dsp/circuits/transistors: measured transistors' values ----------
import type { EbersMollValues } from './ebers-moll-pnp.ts';
import type { Parasitics } from './parasitics.ts';

/**
 * The Mullard OC44, a germanium PNP, as Ebers-Moll: measured on the transistors themselves by Holmes, Holters and
 * van Walstijn (DAFx-17, Table 1), at Vt = 25.5 mV. Samples vary widely: βf from 46 to 175 (DAFx-16).
 */
export const OC44_EBERS_MOLL: EbersMollValues = Object.freeze({
  saturationCurrent: 2.029e-6,
  forwardGain: 108.1,
  reverseGain: 8.602,
  forwardIdeality: 1.062,
  reverseIdeality: 1.105,
  thermalVoltage: 25.5e-3,
});

/**
 * The OC44's base resistance and junction capacitances, from the same measurements' Gummel-Poon fit (DAFx-17, Table 1);
 * the paper's "AC Ebers-Moll" puts them around the Ebers-Moll law.
 */
export const OC44_PARASITICS: Parasitics = Object.freeze({
  baseResistance: 32.83,
  emitterBaseCapacitance: 410e-12,
  collectorBaseCapacitance: 10e-12,
});

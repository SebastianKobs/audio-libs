// ---------- plan/blocks/phase-distortion: one line of a CZ, a cosine through a bent phase ----------
// A Casio CZ's way: a cosine read through a phase bent at a knee.
// The dcw moves the knee from the middle of the period (a sine) toward its start (a saw, or a square).
// So the wave stays sine-like with no fizz, and its brightness is the dcw's, an envelope's to sweep.
// A source: no input. Its detune and stop as an oscillator's.
// Its wave and its start phase are choices, so params:
// the wave moves as it plays; the phase is read once, as a voice is made, and told later it holds the value and moves nothing.
import type { ParamSpecs } from '../../../base/params/index.ts';
import { STOP, type Block } from './block.ts';

// its params, by their names
export const PHASE_DISTORTION_SPECS = {
  frequency: { name: 'frequency', unit: 'Hz', range: [0.01, 20000, 0.01], default: 440, taper: 'octaves' },
  detune: { name: 'detune', unit: 'cents', range: [-4800, 4800, 1], default: 0 },
  dcw: { name: 'dcw', range: [0, 1, 0.001], default: 0 },
  wave: { name: 'wave', choices: ['saw', 'square'], default: 'saw' },
  phase: { name: 'phase', choices: ['reset', 'free'], default: 'reset' },
} as const satisfies ParamSpecs;

const { frequency, detune, dcw, wave, phase } = PHASE_DISTORTION_SPECS;

export default {
  kind: 'phase distortion',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [frequency, detune, dcw, wave, phase, STOP],
  settings: [],
} as const satisfies Block;

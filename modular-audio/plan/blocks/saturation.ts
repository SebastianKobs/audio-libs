// ---------- plan/blocks/saturation: a drive into a style's curve, its level taken back ----------
// The Drive's heart: its style's color before, the drive a gain into a knee fixed at full scale, the curve, a DC block,
// the style's color after, the auto gain.
// Its drive a share shown in dB, 0 to +36; punish +20 dB on top, for a quiet sound to get past the knee; its style a curve and
// its colors (libs/dsp/saturation/); auto how much of the level the drive adds is taken back, 1 all of it against a sine at
// -18 dBFS, 0 none; its oversampling against the harmonics folding back, none the grit option.
// Auto follows the drive through a curve, no straight line: no macro can map it, so it's the block's own.
import type { ParamSpecs } from '../../../base/params/index.ts';
import { DRIVE_STYLES } from '../../../dsp/saturation/index.ts';
import type { Block } from './block.ts';

// a WaveShaper's oversampling, as Web Audio names it; the dry's lag (shaper-lag.ts) follows it
export const OVERSAMPLE = { name: 'oversample', choices: ['none', '2x', '4x'], default: '4x' } as const;

// its params, by their names
export const SATURATION_SPECS = {
  drive: { name: 'drive', range: [0, 36, 0.1], dB: true, default: 1 },
  punish: { name: 'punish', range: [0, 1, 1], default: 0 },
  style: { name: 'style', choices: DRIVE_STYLES, default: 'smooth' },
  auto: { name: 'auto', range: [0, 1, 0.01], default: 1 },
  oversample: OVERSAMPLE,
} as const satisfies ParamSpecs;

const { drive, punish, style, auto, oversample } = SATURATION_SPECS;

export default {
  kind: 'saturation',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [drive, punish, style, auto, oversample],
  settings: [],
} as const satisfies Block;

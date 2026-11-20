// ---------- plan/blocks/shaper: a waveshaper, the sound bent through a curve ----------
// Its drive a share shown in dB: where the curve's knee sits, at 1 / drive of full scale. A quiet sound passes as it
// comes, a loud one is bent, never made louder than it came.
// Its shape: 0 a soft knee, as tape's; 1 a hard one, near a clip.
// Its oversampling, the saturation's, against the harmonics a curve makes folding back below the band, 2x to start.
// All three are params: Web Audio changes a curve and its oversampling as it plays, no rebuild.
// A curve is no param it can automate, so a change lands as it's told; each builder bends its own way.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';
import { OVERSAMPLE } from './saturation.ts';

// its params, by their names
export const SHAPER_SPECS = {
  drive: { name: 'drive', range: [0, 36, 0.1], dB: true, default: 1 },
  shape: { name: 'shape', range: [0, 1, 0.01], default: 0 },
  oversample: { ...OVERSAMPLE, default: '2x' },
} as const satisfies ParamSpecs;

const { drive, shape, oversample } = SHAPER_SPECS;

export default {
  kind: 'shaper',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [drive, shape, oversample],
  settings: [],
} as const satisfies Block;

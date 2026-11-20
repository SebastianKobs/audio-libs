// ---------- plan/blocks/shaper-lag: the dry held back as long as an oversampled shaper ----------
// An oversampled WaveShaper comes out late by its resampling filters (Chromium 4 ms at 4x, Firefox near none): a dry mixed
// under it undelayed combs. This holds the dry back by as long, at the same oversampling, measured in the browser.
import type { Block } from './block.ts';
import { OVERSAMPLE } from './saturation.ts';

export default {
  kind: 'shaper lag',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [OVERSAMPLE],
  settings: [],
} as const satisfies Block;

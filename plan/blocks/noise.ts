// ---------- plan/blocks/noise: noise, as a source ----------
// No input, its noise out. Its colour a setting: noise, or a short breath.
import type { Block } from './block.ts';

// each colour's buffer, as a builder that plays noise from a looping buffer makes it, in seconds: a noise long, a breath short
export const NOISE_SECONDS = { noise: 2, breath: 0.2 } as const;

export default {
  kind: 'noise',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [],
  settings: [{ name: 'colour', choices: ['noise', 'breath'], default: 'noise' }],
} as const satisfies Block;

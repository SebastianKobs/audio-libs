// ---------- plan/blocks/blocks: every block, by its kind ----------
// The list each builder checks itself against: each one built, or a placeholder put in.
import delay from './delay.ts';
import envelope from './envelope.ts';
import filter from './filter.ts';
import gain from './gain.ts';
import limiter from './limiter.ts';
import lookaheadLimiter from './lookahead-limiter.ts';
import noise from './noise.ts';
import onePole from './one-pole.ts';
import oscillator from './oscillator.ts';
import pan from './pan.ts';
import reverb from './reverb.ts';
import saturation from './saturation.ts';
import select from './select.ts';
import shaperLag from './shaper-lag.ts';
import tilt from './tilt.ts';
import { frozen } from '../../../base/util/index.ts';
import type { Block } from './block.ts';

// a block's kind
export type BlockKind = keyof typeof BLOCKS;

// every block by its kind, frozen all the way down, the specs it shares too
export const BLOCKS = frozen({
  oscillator,
  gain,
  filter,
  pan,
  delay,
  reverb,
  noise,
  limiter,
  'lookahead limiter': lookaheadLimiter,
  envelope,
  select,
  saturation,
  'one pole': onePole,
  tilt,
  'shaper lag': shaperLag,
}) satisfies Readonly<Record<string, Block>>;

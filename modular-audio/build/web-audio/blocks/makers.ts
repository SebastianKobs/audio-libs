// ---------- build/web-audio/blocks/makers: each block it can make, by its kind ----------
import type { BlockKind } from '../../../plan/blocks/index.ts';
import type { Maker } from '../making.ts';
import { delay } from './delay.ts';
import { envelope } from './envelope.ts';
import { filter } from './filter.ts';
import { gain } from './gain.ts';
import { limiter } from './limiter.ts';
import { lookaheadLimiter } from './lookahead-limiter.ts';
import { noise } from './noise.ts';
import { onePole } from './one-pole.ts';
import { oscillator } from './oscillator.ts';
import { pan } from './pan.ts';
import { reverb } from './reverb.ts';
import { saturation } from './saturation.ts';
import { select } from './select.ts';
import { shaperLag } from './shaper-lag.ts';
import { tilt } from './tilt.ts';

// each block's maker by its kind
export const MAKERS: Readonly<Partial<Record<BlockKind, Maker>>> = Object.freeze({
  oscillator,
  gain,
  filter,
  pan,
  delay,
  reverb,
  noise,
  limiter,
  'lookahead limiter': lookaheadLimiter,
  select,
  envelope,
  saturation,
  'one pole': onePole,
  tilt,
  'shaper lag': shaperLag,
});

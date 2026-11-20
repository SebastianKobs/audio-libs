// ---------- build/web-audio/blocks/makers: each block it can make, by its kind ----------
import type { BlockKind } from '../../../plan/blocks/index.ts';
import type { Maker } from '../making.ts';
import { compressor } from './compressor.ts';
import { crusher } from './crusher.ts';
import { delay } from './delay.ts';
import { envelope } from './envelope.ts';
import { eqBand } from './eq-band.ts';
import { filter } from './filter.ts';
import { gain } from './gain.ts';
import { grains } from './grains.ts';
import { limiter } from './limiter.ts';
import { lookaheadLimiter } from './lookahead-limiter.ts';
import { noise } from './noise.ts';
import { onePole } from './one-pole.ts';
import { operators } from './operators.ts';
import { oscillator } from './oscillator.ts';
import { pan } from './pan.ts';
import { phaseDistortion } from './phase-distortion.ts';
import { reverb } from './reverb.ts';
import { room } from './room.ts';
import { saturatingFilter } from './saturating-filter.ts';
import { saturation } from './saturation.ts';
import { select } from './select.ts';
import { shaper } from './shaper.ts';
import { shaperLag } from './shaper-lag.ts';
import { syncOscillator } from './sync-oscillator.ts';
import { tilt } from './tilt.ts';
import { wow } from './wow.ts';

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
  'sync oscillator': syncOscillator,
  operators,
  'phase distortion': phaseDistortion,
  crusher,
  grains,
  'saturating filter': saturatingFilter,
  shaper,
  'eq band': eqBand,
  compressor,
  wow,
  room,
});

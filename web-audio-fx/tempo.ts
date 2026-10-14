// ---------- libs/web-audio-fx/tempo: a module's time in beats, following the tempo ----------
// A delay line's time, as an FX channel's own param is automated: in beats, so it follows the tempo, its chain rebuilt at a new one; by
// octaves, a 16th triplet to a dotted half, the shortest and the longest note length a delay line takes (libs/synth/'s delay block).
import { delayBeats } from '../synth/index.ts';
import type { ParamSpec } from '../params/index.ts';

export const TEMPO_TIME: ParamSpec = Object.freeze({
  name: 'time',
  unit: 'beats',
  range: Object.freeze([delayBeats('1/16t', 1), delayBeats('1/2.', 1), 0.001] as const),
  taper: 'octaves',
});

// ---------- libs/web-audio-fx/inserts: the inserts' modules, one of each kind: a Utility, a Filter, a Limiter ----------
// An insert is an FX module as any other (mockup/architecture/mixer-and-fx.md, "Inserts as FX modules"), the same device on a strip or a
// return, as Ableton's are: a patch with an input and an output, built by an FxChain between two points, its values params, read as the
// chain is built (a module's params()) and set live (set()). No theme has its own: they're the desk's
import { LIMITER_SPECS, type Patch } from '../synth/index.ts';
import { FADER_GAIN, PAN as PAN_SPEC, type RangedSpec } from '../params/index.ts';

// the limiter, as Ableton's and FabFilter's Pro-L: its gain into it, in dB, and held at its ceiling, where it acts and the most that comes
// out, in dBFS, by a compressor there as hard as Web Audio's goes. Each dB more gain, a dB louder, never past the ceiling. Release in s.
export interface LimiterSettings {
  gain: number;
  ceiling: number;
  release: number;
}
// the inserts' modules, by kind
export type InsertModule = 'utility' | 'filter' | 'limiter';
// a module's params, by the names its patch gives them, each declared beside its patch, a slider each (F4c), with its range;
// their defaults are its patch's params, as it starts
type InsertParams = Readonly<Record<string, RangedSpec>>;

// a Gain: the gain block, at 1 unless its params say otherwise; its param level, its port 'gain.gain'. A strip's input, fader, sends and
// room, the mixer's sum and master (F5)
export const GAIN: Patch = Object.freeze({
  effect: true,
  chain: ['gain'],
  gain: 'level',
  params: Object.freeze({ level: 1 }),
});
const GAIN_PARAMS: InsertParams = Object.freeze({ level: Object.freeze({ ...FADER_GAIN, unit: 'dB' }) });
// a Pan: the pan block, a mono sound up-mixed to stereo first, as the mixer's pans are, centred unless its params say otherwise; its param
// pan, its port 'pan.pan'. A strip's pan (F5)
export const PAN: Patch = Object.freeze({
  effect: true,
  chain: ['pan'],
  pan: 'pan',
  params: Object.freeze({ pan: 0 }),
});
export const PAN_PARAMS = Object.freeze({ pan: PAN_SPEC }) satisfies InsertParams;
// a Pan whose pan is a pan pot: a mono sound panned as it comes, constant power, as a console's
export const PAN_POT: Patch = Object.freeze({ ...PAN, pan: Object.freeze({ position: 'pan', mono: 'pan pot' }) });
// a Utility: a Gain, then a Pan, the two combined, as data, so it can't drift from them; its params level and pan, its ports 'gain.gain'
// and 'pan.pan'
export const UTILITY: Patch = combined(GAIN, PAN);
const UTILITY_PARAMS: InsertParams = Object.freeze({ ...GAIN_PARAMS, ...PAN_PARAMS });
// a Filter: the synth's filter block, a lowpass, its resonance and cutoff its params, Q 0.707 and wide open unless they say otherwise: 0.5
// a tower's dullness. Its port 'filter.frequency'
export const FILTER: Patch = Object.freeze({
  effect: true,
  chain: ['filter'],
  filter: Object.freeze({ type: 'lowpass', q: 'q', freq: 'cutoff' }),
  params: Object.freeze({ q: 0.707, cutoff: 24000 }),
});
const FILTER_PARAMS: InsertParams = Object.freeze({
  cutoff: Object.freeze({
    name: 'cutoff',
    unit: 'Hz',
    range: Object.freeze([20, 24000, 1] as const),
    taper: 'octaves' as const,
  }),
  q: Object.freeze({ name: 'resonance', range: Object.freeze([0, 30, 0.001] as const) }),
});
// Its gain 16 dB brings the garden at its busiest just under a ceiling of -0.3 dBFS; a much fuller one is held there. The master volume
// after it brings it back down
export const LIMITER_SETTINGS: LimiterSettings = Object.freeze({ gain: 16, ceiling: -0.3, release: 0.3 });
// a Limiter, as Ableton's on the master: the limiter block, its gain, ceiling and release its params, as it starts (LIMITER_SETTINGS);
// how it holds there is the engine's (libs/web-audio-engine/limiter.ts). Its ports 'limiter.gain', 'limiter.ceiling', 'limiter.release'
export const LIMITER: Patch = Object.freeze({
  effect: true,
  chain: ['limiter'],
  limiter: Object.freeze({ gain: 'gain', ceiling: 'ceiling', release: 'release' }),
  params: Object.freeze({ ...LIMITER_SETTINGS }),
});
const LIMITER_PARAMS: InsertParams = LIMITER_SPECS; // the limiter block's
// each insert's module as its slot and its device show it: its name, and its params, each as its device shows it, as Ableton's Utility,
// Auto Filter and Limiter show theirs; and the port each param is set at on its chain, by the param's name, none for one set
// only as it's built (a Filter's resonance)
export const INSERTS: Readonly<
  Record<InsertModule, { name: string; params: InsertParams; ports: Readonly<Record<string, string>> }>
> = Object.freeze({
  utility: Object.freeze({
    name: 'Utility',
    params: UTILITY_PARAMS,
    ports: Object.freeze({ level: 'gain.gain', pan: 'pan.pan' }),
  }),
  filter: Object.freeze({
    name: 'LP filter',
    params: FILTER_PARAMS,
    ports: Object.freeze({ cutoff: 'filter.frequency' }),
  }),
  limiter: Object.freeze({
    name: 'Limiter',
    params: LIMITER_PARAMS,
    ports: Object.freeze({ gain: 'limiter.gain', ceiling: 'limiter.ceiling', release: 'limiter.release' }),
  }),
});
// modules combined into one, as data: their blocks in their order, their params joined; planned and built as one module
function combined(...modules: Patch[]): Patch {
  const joined: Patch = {};
  const params: Record<string, unknown> = {};
  for (const module of modules) {
    Object.assign(joined, module);
    Object.assign(params, module.params);
  }
  return Object.freeze({
    ...joined,
    chain: modules.flatMap((module) => module.chain ?? []),
    params: Object.freeze(params),
  });
}

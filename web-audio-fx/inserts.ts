// ---------- libs/web-audio-fx/inserts: the devices an insert slot may hold, each an FX module ----------
// An insert is an FX module as any other (mockup/architecture/mixer-and-fx.md, "Inserts as FX modules"), the same device on a strip or a
// return, as Ableton's are: a patch with an input and an output, built by an FxChain between two points, its values params, read as the
// chain is built (a module's params()) and set live (set()). No theme has its own: they're the desk's.
// Each a device (DEVICES): its name, its module, its params declared and the port each is set at.
import { LIMITER_SPECS, type Patch } from '../synth/index.ts';
import { FADER_GAIN, PAN as PAN_SPEC, type RangedSpec } from '../params/index.ts';
import { frozen } from '../util/index.ts';

// the limiter, as Ableton's and FabFilter's Pro-L: its gain into it, in dB, and held at its ceiling, where it acts and the most that comes
// out, in dBFS, by a compressor there as hard as Web Audio's goes. Each dB more gain, a dB louder, never past the ceiling. Release in s.
export interface LimiterSettings {
  gain: number;
  ceiling: number;
  release: number;
}
// a module's params, by the names its patch gives them, each declared beside its patch, a slider each (F4c), with its range;
// their defaults are its patch's params, as it starts
type InsertParams = Readonly<Record<string, RangedSpec>>;
// A device, an FX module as an insert slot holds it and its device shows it, as Ableton's
// Utility, Auto Filter and Limiter show theirs:
//   - name: as its slot and its device show it;
//   - kind: its module's kind, the two Utilities one;
//   - patch: its module;
//   - params: its params, declared;
//   - ports: the port each param is set at on its chain, by the param's name;
//     none for one set only as it's built (a Filter's resonance).
export interface Device {
  readonly name: string;
  readonly kind: DeviceKind;
  readonly patch: Patch;
  readonly params: InsertParams;
  readonly ports: Readonly<Record<string, string>>;
}
// the devices, by the name a strip's data gives them, and by kind
export type DeviceName = 'gain' | 'pan' | 'utility' | 'pan pot utility' | 'filter' | 'limiter';
export type DeviceKind = Exclude<DeviceName, 'pan pot utility'>;

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
const PAN_PARAMS: InsertParams = Object.freeze({ pan: PAN_SPEC });
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
// The devices a strip's or a module's data names. The Utility twice:
//   - 'utility': its pan a stereo panner, as the mixer's pans are;
//   - 'pan pot utility': its pan a pan pot, as a mono note was panned before.
const GAIN_DEVICE = {
  name: 'Gain',
  kind: 'gain',
  patch: GAIN,
  params: GAIN_PARAMS,
  ports: { level: 'gain.gain' },
} as const;
const PAN_DEVICE = { name: 'Pan', kind: 'pan', patch: PAN, params: PAN_PARAMS, ports: { pan: 'pan.pan' } } as const;
const UTILITY_PORTS = { ...GAIN_DEVICE.ports, ...PAN_DEVICE.ports } as const;
export const DEVICES = frozen({
  gain: GAIN_DEVICE,
  pan: PAN_DEVICE,
  utility: { name: 'Utility', kind: 'utility', patch: UTILITY, params: UTILITY_PARAMS, ports: UTILITY_PORTS },
  'pan pot utility': {
    name: 'Utility',
    kind: 'utility',
    patch: combined(GAIN, PAN_POT),
    params: UTILITY_PARAMS,
    ports: UTILITY_PORTS,
  },
  filter: {
    name: 'LP filter',
    kind: 'filter',
    patch: FILTER,
    params: FILTER_PARAMS,
    ports: { cutoff: 'filter.frequency' },
  },
  limiter: {
    name: 'Limiter',
    kind: 'limiter',
    patch: LIMITER,
    params: LIMITER_PARAMS,
    ports: { gain: 'limiter.gain', ceiling: 'limiter.ceiling', release: 'limiter.release' },
  },
} as const satisfies Record<DeviceName, Device>);
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

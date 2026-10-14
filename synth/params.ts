// ---------- libs/synth/params: the synth's own params, as a plugin describes its own (libs/params/) ----------
// Every block declares its values so (I1a, mockup/architecture/done.md), each its paramSpecs, as libs/params/ has a param. Every value
// reaches the notes that sound as it's set (G0.2b, edit.ts), so none is marked live, as I1f marked the VCA's and out's.
// Here what several blocks share: an envelope's values, a filter's, a level, a ratio, a stop, a limiter's, and the patch's own,
// its handle's.
import type { ParamSpec, ParamSpecs } from '../params/index.ts';

// a level, a share, 1 at 0 dB
export const LEVEL_SPEC = { name: 'level', range: [0, 2, 0.01] } as const satisfies ParamSpec;
// a ratio to the note's frequency
export const RATIO_SPEC = { name: 'ratio', range: [0.25, 16, 0.01] } as const satisfies ParamSpec;
// when a source stops, s from the note's start
export const STOP_SPEC = { name: 'stop', unit: 's', range: [0, 10, 0.01] } as const satisfies ParamSpec;
// a limiter's (blocks/limiter.ts), the Limiter insert's too: its gain into it, in dB; its ceiling, in dBFS; its release
export const LIMITER_SPECS = {
  gain: { name: 'gain', unit: 'dB', range: [-12, 24, 0.1] },
  ceiling: { name: 'ceiling', unit: 'dBFS', range: [-12, 0, 0.1] },
  release: { name: 'release', unit: 's', range: [0.01, 1, 0.01] },
} as const satisfies ParamSpecs;

// an envelope's knobs (blocks/envelope.ts, stages.ts, I1h): its amount, in its target's units, so wide a range; its stages' times; its
// sustain, a share of its amount; with no release, none: it rings on
export const ENVELOPE_SPECS = {
  amount: { name: 'amount', range: [-48, 48, 0.01], default: 1 },
  delay: { name: 'delay', unit: 's', range: [0, 10, 0.001], default: 0 },
  attack: { name: 'attack', unit: 's', range: [0, 10, 0.001], default: 0 },
  hold: { name: 'hold', unit: 's', range: [0, 10, 0.001], default: 0 },
  decay: { name: 'decay', unit: 's', range: [0, 10, 0.001], default: 0 },
  sustain: { name: 'sustain', range: [0, 1, 0.01], default: 1 },
  release: { name: 'release', unit: 's', range: [0, 10, 0.001] },
} as const satisfies ParamSpecs;
// an envelope's amount as its cable draws it, by its target's kind (I1h3): a gain's share of its level, a pitch's or a cutoff's semitones,
// FM's index
export const AMOUNT_SPECS = {
  gain: { name: 'amount', unit: '× level', range: [0, 2, 0.01], default: 1 },
  pitch: { name: 'amount', unit: 'st', range: [-48, 48, 0.1], default: 1 },
  index: { name: 'amount', unit: 'index', range: [0, 20, 0.01], default: 1 },
} as const satisfies ParamSpecs;
// a term's mapping (mappings.ts, I1i2): its factor, how much of its source it takes; its offset and its range in its value's own units
export const MAPPING_SPECS = {
  factor: { name: 'factor', range: [0, 10, 0.01], default: 1 },
} as const satisfies ParamSpecs;
// a note's own values a term can name (values.ts, I1i3), as MIDI 2.0's per-note values: its length to its note-off, a bloom's rise, its
// vibrato, in cents, its bend, in semitones
export const PER_NOTE_SPECS = {
  duration: { name: 'length', unit: 's', range: [0.05, 10, 0.01] },
  rise: { name: 'rise', unit: 's', range: [0, 5, 0.01] },
  vibrato: { name: 'vibrato', unit: 'cents', range: [0, 50, 0.1] },
  pitchBend: { name: 'bend', unit: 'st', range: [-12, 12, 0.1] },
} as const satisfies ParamSpecs;
// a filter's values: the chain's, and a noise's own; its cutoff in hertz, or following the note, a multiple of it, at most so much
export const FILTER_SPECS = {
  type: {
    name: 'type',
    choices: ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf', 'allpass'],
  },
  q: { name: 'q', range: [0, 30, 0.1] },
  freq: {
    name: 'freq',
    unit: 'Hz',
    range: [20, 20000, 1],
    parts: { key: { name: 'key', range: [0.25, 16, 0.01] }, max: { name: 'max', unit: 'Hz', range: [20, 20000, 1] } },
  },
} as const satisfies ParamSpecs;
// the patch's own values, not a block's: its handle's, how fast it retunes or follows a tempo
export const PATCH_SPECS = {
  handle: {
    retune: { tc: { name: 'tc', unit: 's', range: [0, 5, 0.001] } },
    tempo: { tc: { name: 'tc', unit: 's', range: [0, 5, 0.001] } },
  },
} as const satisfies ParamSpecs;

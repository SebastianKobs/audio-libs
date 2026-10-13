// ---------- libs/synth/params: a module's params as a plugin describes its own, apart from any view ----------
// Every module declares its params so (I1a, mockup/architecture/done.md): a block its values (each block's paramSpecs), an FX module the
// params its patch names. Each one's name; its unit; its range and step in that unit; its choices, where it picks among words; its default,
// where a block falls back to one, so the block reads it from here; and, for a gain, whether it's a share shown in dB, its range in dB.
// Every value reaches the notes that sound as it's set (G0.2b, edit.ts), so none is marked live, as I1f marked the VCA's and out's.
// A value written either as itself or by its parts (a cutoff, or { key, max }) has both. A surface only decides how to draw one: a slider
// or a knob, and its taper. What's structure has no spec: a condition, where a sound goes, what a modulator moves, the chain, a switch.
// Here too what several blocks share: an envelope's values, a filter's, and the patch's own, its handle's

// a param, as a plugin describes its own
export interface ParamSpec {
  readonly name: string;
  readonly unit?: string;
  readonly range?: readonly [lo: number, hi: number, step: number];
  readonly choices?: readonly string[];
  readonly default?: number | string;
  readonly dB?: true;
  readonly parts?: ParamSpecs;
}
// a module's params, or a part's, by their keys, a nested part's under its own
export interface ParamSpecs {
  readonly [key: string]: ParamSpec | ParamSpecs;
}

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

// a value's spec by its path from where its specs start: a list's index and a condition's branches passed over; once at a value, a part
// by its key, and a range's ends; anything else, or a path that ends at a part, has none
export function specAt(
  specs: ParamSpec | ParamSpecs | undefined,
  path: readonly (string | number)[],
): ParamSpec | undefined {
  let at = specs;
  for (const key of path) {
    if (at === undefined) {
      return undefined;
    }
    if (typeof key === 'number' || key === 'then' || key === 'else') {
      continue;
    }
    at = isParamSpec(at) ? partOf(at, key) : at[key];
  }
  return at && isParamSpec(at) ? at : undefined;
}
function isParamSpec(specs: ParamSpec | ParamSpecs): specs is ParamSpec {
  return typeof specs.name === 'string';
}
// within a value: a part by its key, itself for a range's end
function partOf(spec: ParamSpec, key: string): ParamSpec | ParamSpecs | undefined {
  if (key === 'between') {
    return spec;
  }
  return spec.parts?.[key];
}

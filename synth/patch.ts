// ---------- libs/synth/patch: what a patch is, as data ----------
// A patch is its blocks (blocks/), each under its key, and its own settings. What each block's values mean is in its module; how a value
// can depend on the note (a condition, a draw, a param's name) is in values.ts. This is the format a theme writes (themes/<theme>/sound.ts,
// effects.ts), and the one an editor, or another engine (the Flutter app's), reads
import type { Condition, Freq, Time, Valued } from './values.ts';

// an envelope (blocks/envelope.ts), a block of its own, cabled to the port it moves (target), as a synth's envelope (I1h): its shape from 0
// after its delay up to 1 over its attack, held over its hold, down to its sustain (0 to 1) over its decay, held until the note-off, its
// sustain point, and from there down to 0 over its release; with no attack it starts at 1, with no release it rings on past a note-off. A
// note with a length released at its end, one without when it's let go (I1d). How far it moves its target, its amount, in the target's
// units (shapes.ts): a gain's share of its level, times the note's velocity unless it says not; semitones for a pitch or a cutoff; FM's
// index; its target's own value where it starts and ends. The presets write it (perc(), adsr(), swell(), stage())
export interface Envelope {
  velocity?: boolean; // false: its amount the same at any velocity
  amount?: Valued<number>; // a number, or a value of the note's by name ('pitchBend')
  delay?: Time;
  attack?: Time;
  hold?: Time;
  decay?: Time;
  sustain?: Valued<number>;
  release?: Time;
  target?: string;
  when?: Condition;
}
export interface Osc {
  wave?: string;
  hz?: number;
  ratio?: number;
  detune?: number | number[];
  levels?: 'each';
  level?: Valued<number>;
  into?: string;
  stop?: Time;
  when?: Condition;
}
export interface FrequencyModulation {
  ratio: number;
  index?: number;
  carrier: number;
  stop?: Time;
  when?: Condition;
}
export interface Ring {
  ratio: number;
  into?: string;
  stop?: Time;
  when?: Condition;
}
export interface Noise {
  buffer?: 'noise' | 'breath'; // 2 s of noise, or a 0.2 s breath (blocks/noise.ts)
  loop?: boolean;
  offset?: number;
  filter: Biquad;
  level?: Valued<number>;
  into?: string;
  stop?: Time;
  when?: Condition;
}
export interface Lfo {
  rate: Valued<number | string>;
  depth: Valued<number>;
  ofNote?: boolean;
  delay?: Time;
  fade?: Time;
  curve?: 'linear';
  target: string;
  free?: boolean;
  stop?: Time;
  when?: Condition;
}
// a biquad's settings: the chain's filter's, a noise's own
export interface Biquad {
  type: string;
  q?: Valued<number>; // a number, or a param's (the Filter module's)
  freq?: Freq;
  slope?: string; // 12 or 24 dB an octave, or a param that holds one
}
export interface Filter extends Biquad {
  when?: Condition;
}
// a delay line: its time with a sync switch, synced its note value at the beat, free in ms; each a value or a param it names
export interface Delay {
  sync: Valued<number>;
  note: string;
  ms: Valued<number>;
  feedback: Valued<number>;
  tone: Valued<number>;
  max?: number;
  when?: Condition;
}
export interface Reverb {
  seconds?: number;
  when?: Condition;
}
// a patch's handle: what a playing note can still be told (a glide, a new tempo), there only when it says; its end is
// its envelopes' release (plan.ts, release())
export interface Handle {
  when?: Condition;
  glide?: unknown;
  tempo?: { tc: number };
}
// the chain's VCA (blocks/vca.ts): its level, after the gain its envelope moves
export interface Vca {
  level?: number;
}
// the patch's one output (blocks/out.ts): its volume
export interface Out {
  volume?: number;
}
// where the note comes in (blocks/note.ts): how far above it, how fast to its glides, its shortest and longest, and whether it runs on
export interface NoteIn {
  transpose?: number;
  glide?: number; // a time constant
  shortest?: number;
  longest?: number;
  continuous?: boolean;
}
// a pan written with how it pans a mono sound (blocks/pan.ts): its position, and up-mixed to stereo first, as the mixer's pans are, or as
// a console's pan pot, constant power, 3 dB down in the middle
export interface Pan {
  position: Valued<number>;
  mono?: 'up-mix' | 'pan pot';
}
// a limiter as Ableton's: its gain into it in dB, its ceiling in dBFS, its release in s (blocks/limiter.ts)
export interface Limiter {
  gain: Valued<number>;
  ceiling: Valued<number>;
  release: Valued<number>;
}
export interface Patch {
  params?: Record<string, unknown>;
  note?: NoteIn;
  out?: Out;
  chain?: string[];
  effect?: boolean;
  handle?: Handle;
  vca?: Vca; // a gain its envelope moves, then its level (I1e)
  filter?: Valued<Filter>;
  tremolo?: Valued<true>; // on, at its own depth and rate (blocks/tremolo.ts)
  oscs?: Valued<Osc>[];
  fm?: Valued<FrequencyModulation>[];
  ring?: Valued<Ring>[];
  noise?: Valued<Noise>[];
  lfos?: Valued<Lfo>[];
  envelopes?: Valued<Envelope>[];
  delay?: Valued<Delay>;
  reverb?: Valued<Reverb>;
  gain?: Valued<number>; // a stage that sets how loud, built at 1 too (blocks/gain.ts)
  pan?: Valued<number> | Pan; // a stereo position, -1 left to 1 right, or with how it pans a mono sound (blocks/pan.ts)
  limiter?: Valued<Limiter>;
}

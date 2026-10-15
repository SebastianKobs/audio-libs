// ---------- libs/synth/shapes: an envelope, as automation on the param it moves ----------
// The envelope block (blocks/envelope.ts) holds the presets patches use; this is how an envelope becomes automation (patch.ts, I1h): its
// shape's stages (stages.ts), then its release from the note-off (I1d): a note with a length released at its end, in its plan, what its
// stages would do after it left out; one without by released(), when it's let go, which says when it has faded too. Its amount moves its
// target in the target's units, the port's kind by its param: a gain its level times the amount and the shape, times the note's velocity
// unless it says not, from where it rests (FM's index; a level from silence), its attack straight, its decay and release exponential, in
// dB; a pitch or a cutoff in semitones from its own, every stage straight in them; anything else its amount added, straight
import { val, type Valued, type Values } from './values.ts';
import type { Envelope } from './patch.ts';
import { eventTime, type Automation } from '../automation/index.ts';
import { releaseOf, stagesOf, type Target } from './stages.ts';
import { SILENCE } from '../params/index.ts';

// what an envelope needs of the note being planned (plan-builder.ts's builder): its values, its velocity, whether it runs on
interface Planning {
  values: Values;
  velocity: number;
  continuous: boolean;
}
// a port's kind, by its param: a gain, a pitch (a frequency), or anything else
export type Kind = 'gain' | 'pitch' | 'linear';
// what a port makes of an envelope's amount: its kind; its own value (an osc's frequency, a cutoff; a gain's level, what an amount of 1
// reaches); where a gain rests, in its amount's units (FM's index); and a gain's silence, where its level comes after it (the VCA's)
export interface Scale {
  kind?: Kind | undefined;
  base?: number | undefined;
  rest?: number | undefined;
  silence?: number | undefined;
}

// a port's kind, by the param it moves
export function kindOf(param: string): Kind {
  if (param === 'gain') {
    return 'gain';
  }
  if (param === 'frequency') {
    return 'pitch';
  }
  return 'linear';
}
// an envelope's automation at a port: its stages, and, where it has a release and the note a length, released at its end from where its
// stages have it then, what they'd do after it left out
export function events(envelope: Envelope, planning: Planning, scale: Scale = {}): Automation[] {
  const note = noteOf(envelope, planning, scale);
  const stages = stagesOf(envelope, note);
  const end = planning.values.duration;
  if (envelope.release === undefined || end === undefined) {
    return stages;
  }
  const before = stages.filter((event) => eventTime(event) <= end);
  return [...before, ...releaseOf(envelope, note, { from: end, stages }).automation];
}
// its release from a note-off, at from, from where its stages have it then, and when it has faded
export function released(
  envelope: Envelope,
  planning: Planning,
  { from, scale }: { from: number; scale: Scale },
): { automation: Automation[]; faded: number } {
  const note = noteOf(envelope, planning, scale);
  return releaseOf(envelope, note, { from, stages: stagesOf(envelope, note) });
}

// what its stages need of the note: its values, whether it runs on, and its target as the port and the note make it
function noteOf(envelope: Envelope, planning: Planning, scale: Scale): Parameters<typeof stagesOf>[1] {
  return { values: planning.values, continuous: planning.continuous, target: targetOf(envelope, planning, scale) };
}
// its target: what a point of its shape is at the port, by the port's kind, and the ramp each stage takes there
function targetOf(envelope: Envelope, planning: Planning, { kind = 'linear', base, rest = 0, silence }: Scale): Target {
  const amount = amountOf(envelope.amount, planning.values);
  if (kind === 'pitch') {
    return { valueAt: (point) => (base ?? 1) * Math.pow(2, (amount * point) / 12), rampOf: () => 'exp' };
  }
  if (kind === 'linear') {
    return { valueAt: (point) => (base ?? 0) + amount * point, rampOf: () => 'linear' };
  }
  const full = envelope.velocity === false ? amount : amount * planning.velocity; // times the note's velocity
  return {
    valueAt: (point) => {
      const value = (base ?? 1) * (rest + full * point);
      return value > 0 ? value : (silence ?? SILENCE); // an exponential ramp's floor
    },
    rampOf: (stage) => (stage === 'attack' ? 'linear' : 'exp'),
  };
}
// its amount, as the note asks for it: a number, or one of the note's values by name, with a factor ('pitchBend', '0.5 pitchBend')
function amountOf(written: Valued<number> | undefined, values: Values): number {
  if (written === undefined) {
    return 1;
  }
  const amount = val<number | string>(written, values);
  if (typeof amount !== 'number') {
    throw new Error(`an amount of an envelope it can't read: ${amount}`);
  }
  return amount;
}

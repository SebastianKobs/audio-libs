// ---------- libs/synth: the synth. A patch and a note in; the graph the note needs out, as data ----------
// A patch is built from blocks, as on many synths: oscs, LFOs, envelopes, FM, ring modulation, noise, and the chain each sound goes
// through on its way out (vca, filter, tremolo, in the patch's order), and an instrument's out, its volume. Each block is a module of its own (blocks/), planning its part into the builder
// (plan.ts) and connecting to the others by ports; the planner only walks the patch, so a new block is a new module in BLOCKS.
// A patch's params are its own values, with defaults (a tap's decay), which a user's settings can set (params): the device's state. The
// note brings what varies with what's played (Note, values.ts): its pitch and velocity; its duration; its pitch bend (semitones) and pitch
// glides ([[time, pitch]]), for a phrase's notes; its vibrato (cents); held, a vine's; rise, how fast a drone's harmonics join. Its
// context comes beside it (Context): beat, a beat's length, for note values; key, the mood ({ root, scale }); random(), for noise's
// offsets and values drawn at random. A patch's durations can be capped (duration: { max }). Values: values.ts. Envelopes:
// blocks/envelope.ts, shapes.ts. What a patch is, as data: patch.ts; a plan: plan.ts.
// An FX module is a patch too (effect: true), with an input where an instrument has sources: a delay line (blocks/delay.ts), a reverb
// (blocks/reverb.ts), an LFO on the delay's time; it plays no note, and its context brings a beat's length and random(). An insert is
// one too: a gain (blocks/gain.ts), a pan (blocks/pan.ts), a limiter (blocks/limiter.ts), the filter; an instrument's out is a gain at its output, built at 1 too (blocks/out.ts)
// A patch edited while a note sounds: the note follows it from now, its plan before and after compared (followEdit(), libs/audio-plan/, G0.2b),
// or, its structure changed, it's rebuilt, crossfaded through its out (fades.ts).
// No Web Audio: an engine builds the plan
import type { Automation } from '../audio-plan/index.ts';
import type { Plan } from './plan.ts';
import { events, kindOf } from './shapes.ts';
import { PlanBuilder, type Block } from './plan-builder.ts';
import { time, val, when, type Context, type Note, type Params, type Values, type Valued } from './values.ts';
import type { Patch } from './patch.ts';
import { AMOUNT_SPECS, ENVELOPE_SPECS, PATCH_SPECS, PER_NOTE_SPECS } from './params.ts';
import { specAt, type ParamSpec } from '../params/index.ts';
import vca from './blocks/vca.ts';
import filter from './blocks/filter.ts';
import tremolo from './blocks/tremolo.ts';
import osc from './blocks/osc.ts';
import fm from './blocks/fm.ts';
import ring from './blocks/ring.ts';
import noise from './blocks/noise.ts';
import lfo from './blocks/lfo.ts';
import envelope from './blocks/envelope.ts';
import out from './blocks/out.ts';
import delay from './blocks/delay.ts';
export { delayBeats, delayTimeOf } from './blocks/delay.ts';
import reverb from './blocks/reverb.ts';
import gain from './blocks/gain.ts';
import pan from './blocks/pan.ts';
import limiter from './blocks/limiter.ts';
import note from './blocks/note.ts';
export type { Delay, Envelope, Osc, Patch } from './patch.ts';
export { portValue, type Plan } from './plan.ts';
export type { Block } from './plan-builder.ts';
export { LIMITER_SPECS, MAPPING_SPECS, PER_NOTE_SPECS } from './params.ts';
export { kindOf } from './shapes.ts';
export {
  isNoteValue,
  NO_DRAWS,
  time,
  val,
  type Context,
  type Note,
  type Params,
  type Values,
  type Valued,
} from './values.ts';
export { adsr, perc, stage, swell } from './blocks/envelope.ts';

export { mtof } from '../music-theory/index.ts';
export { mappingOf, termOf, type Mapping } from './mappings.ts';
export { fadeIn, fadeOut } from './fades.ts';
export const BLOCKS: Block[] = [
  note,
  vca,
  filter,
  tremolo,
  osc,
  fm,
  ring,
  noise,
  lfo,
  envelope,
  out,
  delay,
  reverb,
  gain,
  pan,
  limiter,
];

// a note's plan, from its patch: the note's values (pitch, velocity, duration, …), its context beside it (the tempo, the random source),
// the patch's params set by a user's settings (params). An FX module plays no note: an empty one
export function plan(
  patch: Patch,
  note: Partial<Note>,
  context: Context,
  params: Params = {},
  blocks: Block[] = BLOCKS,
): Plan {
  const values = valuesOf(patch, note, context, params);
  const builder = new PlanBuilder(patch, values, movedPorts(patch, values));
  for (const block of blocks) {
    specsOf(patch, block).forEach((written, index) => {
      const spec = val(written, values);
      if (isWritten(spec) && when(spec, values)) {
        block.plan(spec, builder, index + 1, patch);
      }
    });
  }
  return builder.build(patch.chain ?? ['vca', 'filter', 'tremolo']);
}
// an envelope's automation for a note, in its own terms, for a surface to draw (I1g3): a share of the level it moves, or a ratio to its
// target's own; and its delay, where its attack starts (I1h3); none where nothing's written there, or it isn't this note's
export function envelopeEvents(
  patch: Patch,
  index: number,
  note: Partial<Note>,
  context: Context,
  params: Params = {},
): { automation: Automation[]; delay: number } | null {
  const values = valuesOf(patch, note, context, params);
  const envelope = val(patch.envelopes?.[index], values);
  if (!isWritten(envelope) || !when(envelope, values)) {
    return null;
  }
  return {
    automation: events(envelope, planningOf(patch, values), { kind: kindOf(envelope.target?.split('.').at(-1) ?? '') }),
    delay: envelope.delay === undefined ? 0 : time(envelope.delay, values),
  };
}
// an envelope's amount as its cable draws it, by the port it's cabled to (I1h3): a gain's share of its level, FM's index, a pitch's or a
// cutoff's semitones; anything else in its target's own units, as its block declares it
export function amountSpec(target: string, blocks: Block[] = BLOCKS): ParamSpec {
  const at = target.lastIndexOf('.');
  const [block, param] = [target.slice(0, at), target.slice(at + 1)];
  const kind = kindOf(param);
  if (kind === 'pitch') {
    return AMOUNT_SPECS.pitch;
  }
  if (kind === 'gain') {
    return block.startsWith('fm') ? AMOUNT_SPECS.index : AMOUNT_SPECS.gain;
  }
  const own = paramOf([...pathOf(block), param], blocks);
  return own ? { ...own, name: 'amount' } : ENVELOPE_SPECS.amount;
}
// a value's spec by its path in a patch (params.ts): its block's, by the block's key, or the patch's own
export function paramOf(path: readonly (string | number)[], blocks: Block[] = BLOCKS): ParamSpec | undefined {
  const [key, ...rest] = path;
  const block = blocks.find((candidate) => candidate.key === key);
  if (block) {
    return specAt(block.paramSpecs, rest);
  }
  return specAt(PATCH_SPECS, path);
}
// the note's own values a patch reads (I1i3): those a term, a value or a condition of it names ('1.5 rise', 'vibrato', 'held && vibrato > 0')
export function noteValuesRead(patch: Patch): ReadonlySet<string> {
  const words = new Set(stringsOf(patch).flatMap((written) => written.match(/[A-Za-z]+/g) ?? []));
  return new Set(Object.keys(PER_NOTE_SPECS).filter((key) => words.has(key)));
}
// the note numbers a patch's conditions name ('pitch == 38'), each a pad of a drum rack, played only for its note (G0.2c): a surface
// plans a note for each, so it shows every pad
export function padsOf(patch: Patch): number[] {
  const named = stringsOf(patch).flatMap((written) =>
    [...written.matchAll(/\bpitch\s*==\s*(\d+)/g)].map((match) => Number(match[1])),
  );
  return [...new Set(named)].sort((one, other) => one - other);
}
// a note's values, as its patch plays it: the patch's params, as a user's settings set them, the note's, its context's; a length clamped
// to the patch's longest and shortest; a held note, with none, sounds until it's let go (G0i2). What a term reads, as a surface shows it
// for its test note (I1i2)
export function valuesOf(patch: Patch, note: Partial<Note>, context: Context, params: Params): Values {
  const values: Values = { ...patch.params, ...params, ...note, ...context };
  if (values.duration === undefined) {
    return values;
  }
  const { longest, shortest } = patch.note ?? {};
  if (longest !== undefined) {
    values.duration = Math.min(longest, values.duration);
  }
  if (shortest !== undefined) {
    values.duration = Math.max(shortest, values.duration);
  }
  return values;
}
// every string a patch writes, at any depth: its terms, its values by name, its conditions, its words
function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  return value && typeof value === 'object' ? Object.values(value).flatMap(stringsOf) : [];
}
// the note as an envelope's events plan it: its values, its velocity (1 for a sound that runs on), whether it runs on
function planningOf(patch: Patch, values: Values): { values: Values; velocity: number; continuous: boolean } {
  const continuous = !!patch.note?.continuous;
  return { values, velocity: continuous ? 1 : (values.velocity ?? 1), continuous };
}
// where a block is written in a patch, by its name: a part of many, its list and its place ('osc 2', 'oscs' every osc's); else its key
function pathOf(block: string): (string | number)[] {
  const [kind = '', number = '1'] = block.split(' ');
  const many: Record<string, string> = { osc: 'oscs', oscs: 'oscs', noise: 'noise', fm: 'fm', lfo: 'lfos' };
  return many[kind] ? [many[kind], Number(number) - 1] : [block];
}
// the ports the patch's envelope blocks move, for this note, so the blocks offering them build them (an osc's level)
function movedPorts(patch: Patch, values: Values): ReadonlySet<string> {
  const moved = (patch.envelopes ?? [])
    .map((written) => val(written, values))
    .filter((envelope) => isWritten(envelope) && when(envelope, values));
  return new Set(moved.map((envelope) => envelope.target!)); // an envelope block is cabled to its target
}
// a spec that's there: a 0 is one (a centred pan, a level at nothing); none, or one turned off (false), isn't
function isWritten<Spec>(spec: Spec): spec is Exclude<Spec, undefined | null | false> {
  return spec !== undefined && spec !== null && spec !== false;
}
// a block's specs as the patch writes them: a block of many its list, any other its one, if it's there, or, one every instrument has,
// as it is unwritten
function specsOf(patch: Patch, block: Block): Valued<object>[] {
  const written = patch[block.key] as Valued<object> | Valued<object>[] | undefined;
  if (block.many) {
    return (written ?? []) as Valued<object>[];
  }
  if (written === undefined) {
    return block.everyInstrument && !patch.effect ? [{}] : [];
  }
  return [written];
}

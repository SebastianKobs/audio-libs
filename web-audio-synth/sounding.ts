// ---------- libs/web-audio-synth/sounding: each patch's notes that sound, until they've stopped, so an edit to it reaches them ----------
// G0.2b (mockup/architecture/done.md; the tool's until Z7), begun in I1f with the VCA's level and out's volume: as a patch is set (patches.ts), every
// note of it that sounds follows, as a synth's knob turned while a note sounds. Planned again from the edited patch, with its note, its
// context, its random draws and its params, and moved there from now (followEdit(), libs/audio-plan/): a value glided there by 50 ms, an
// envelope taken on from where it is. A change of structure rebuilds it: a new voice, planned as if it had started with the note, fading
// in over 0.1 s as the old one fades out (fadeIn(), fadeOut()). What a note was told since, its release, a control's set, a glide, a hit,
// is kept as asked and turned into operations by whichever plan it has: compared with an edit by, and told a rebuilt voice too. The engine
// doesn't say when a note has stopped, so a note sounds until its sources' last stop: as its plan has them, or sooner where what it was
// told stops them (a release); for good where a source never stops (a background, a note held open). Those stopped are let go of as a
// note is added or a patch set
import { fadeIn, fadeOut, plan, type Patch, type Plan, type Context, type Note, type Params } from '../synth/index.ts';
import { followEdit, type Operation, type PlanNode } from '../audio-plan/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import { entryOf } from '../util/index.ts';

// a note as it sounds, as its instrument hands it over: its plan, its start (a context time), its operations applied to what was built of
// it; its plan again from an edited patch; and a voice of its own built from a plan, as if it had started with the note, into where it
// goes, how operations are applied to it
export interface SoundingNote {
  plan: Plan;
  start: number;
  apply: (ops: Operation[]) => void;
  replan: (patch: Patch) => Plan;
  rebuild: (plan: Plan) => (ops: Operation[]) => void;
}
// what a note is told while it sounds, as its plan turns it into operations: its release, a control's set, a glide, a hit
export type Told = (current: Plan) => Operation[];
// a note as it plays on: its plan as it plays now, an edit's, and what it's told, turned into operations by that plan and applied; and
// whether it has stopped by now, a context time (V3)
export interface Played {
  readonly plan: Plan;
  tell(told: Told): void;
  stopped(now: number): boolean;
}
// a note as it's kept: as it plays now; what it was told, as asked and as the operations its plan made of it; its sources' stops by id
interface Kept {
  note: SoundingNote;
  told: Told[];
  ops: Operation[];
  stops: Map<number, number>;
}

const CROSSFADE = 0.1; // s: a rebuilt voice fades in, and the old one out, over this

export class Sounding {
  readonly #notes = new WeakMap<Patch, Set<Kept>>(); // each instrument's notes, by its patch as it plays
  // a note that sounds on a patch, from its start: how it plays on
  add(patch: Patch, note: SoundingNote): Played {
    const notes = this.#notesOf(patch);
    letGoOfStopped(notes, note.start);
    const kept: Kept = { note: { ...note }, told: [], ops: [], stops: stopsOf(note.plan) };
    notes.add(kept);
    return {
      get plan() {
        return kept.note.plan;
      },
      tell: (told) => tell(kept, told),
      stopped: (now) => stoppedBy(kept, now),
    };
  }
  // an edited patch's notes that sound at now, a context time, each following it from now
  edit(patch: Patch, now: number): void {
    const notes = this.#notes.get(patch);
    if (!notes) {
      return;
    }
    letGoOfStopped(notes, now);
    for (const kept of notes) {
      follow(kept, patch, now - kept.note.start);
    }
  }
  #notesOf(patch: Patch): Set<Kept> {
    return entryOf(this.#notes, patch, () => new Set());
  }
}

// a note built into where it goes, to be kept as it sounds: its patch planned with its note, context and params, its random draws kept so
// it plans again alike, built from its start, and rebuilt there as if it had started with the note
export function builtNote(
  engine: Engine,
  {
    patch,
    note,
    context,
    params = {},
    start,
    into,
  }: {
    patch: Patch;
    note: Partial<Note>;
    context: Context;
    params?: Params;
    start: number;
    into: AudioNode;
  },
): SoundingNote {
  const draws = keptDraws(context.random);
  const planned = plan(patch, note, { ...context, random: draws.random }, params);
  return {
    plan: planned,
    start,
    apply: built(engine, planned, start, into),
    replan: (edited) => plan(edited, note, { ...context, random: draws.again() }, params),
    rebuild: (rebuilt) => built(engine, rebuilt, start, into),
  };
}
// a plan built into where it goes from its start: how operations are applied to what was built
function built(engine: Engine, planned: Plan, start: number, into: AudioNode): (ops: Operation[]) => void {
  const made = engine.build(planned, start, into);
  return (ops) => engine.apply(made, ops, start);
}
// a source of random draws kept as it draws, so a note planned again draws the same: again(), a source handing them back in turn, then
// fresh ones once they've run out
function keptDraws(random: () => number): { random: () => number; again: () => () => number } {
  const drawn: number[] = [];
  return {
    random: () => {
      const draw = random();
      drawn.push(draw);
      return draw;
    },
    again: () => {
      let next = 0;
      return () => {
        next += 1;
        return drawn[next - 1] ?? random();
      };
    },
  };
}
// a note told something: kept as asked, turned into operations by its plan as it plays now, applied
function tell(kept: Kept, told: Told): void {
  const ops = told(kept.note.plan);
  kept.told.push(told);
  kept.ops.push(...ops);
  stopsIn(kept, ops);
  kept.note.apply(ops);
}
// a note following an edited patch from at: moved there, or, its structure changed, rebuilt
function follow(kept: Kept, patch: Patch, at: number): void {
  const after = kept.note.replan(patch);
  const ops = followEdit(kept.note.plan, after, at, kept.ops);
  if (ops === null) {
    rebuild(kept, after, at);
    return;
  }
  stopsIn(kept, ops);
  kept.note.apply(ops);
  kept.note.plan = after;
}
// a note rebuilt from at: its old voice faded out as a new one, its plan faded in, comes in, told all the old one was
function rebuild(kept: Kept, after: Plan, at: number): void {
  const { note } = kept;
  note.apply(fadeOut(note.plan, at, CROSSFADE, kept.ops));
  const faded = fadeIn(after, at, CROSSFADE);
  note.apply = note.rebuild(faded);
  note.plan = faded;
  kept.ops = kept.told.flatMap((told) => told(faded));
  kept.stops = stopsOf(faded);
  stopsIn(kept, kept.ops);
  note.apply(kept.ops);
}
// the stops among operations, kept: the last one called holds, as Web Audio's
function stopsIn(kept: Kept, ops: Operation[]): void {
  for (const op of ops.filter((stopping) => stopping.stop !== undefined)) {
    kept.stops.set(op.id, op.stop!);
  }
}
// a plan's sources' stops, by id
function stopsOf(planned: Plan): Map<number, number> {
  return new Map(planned.nodes.filter((node) => node.starts.length).map((node) => [node.id, lastStop(node)]));
}
// the notes whose sources have all stopped by now, a context time, let go of
function letGoOfStopped(notes: Set<Kept>, now: number): void {
  for (const kept of notes) {
    if (stoppedBy(kept, now)) {
      notes.delete(kept);
    }
  }
}
// whether a note's sources have all stopped by now, a context time
function stoppedBy(kept: Kept, now: number): boolean {
  return now - kept.note.start > Math.max(...kept.stops.values());
}
// a source's last stop, from its note's start; none, it sounds for good
function lastStop(node: PlanNode): number {
  return node.stops.length ? Math.max(...node.stops.map(([at]) => at)) : Infinity;
}

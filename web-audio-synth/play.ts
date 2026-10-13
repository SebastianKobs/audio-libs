// ---------- libs/web-audio-synth/play: a note played on a patch, built from its time into where it goes, its controls (Z7) ----------
// Its times clock times, the engine's edge turning them into the context's (libs/web-audio-engine/), never in its past: the note planned
// from the patch with its context and params (libs/synth/), built, and kept as it sounds by the patches it plays on (patches.ts), so an
// edit to its patch reaches it. An instrument plays each of its notes through it (instrument.ts, V3); the tool's voices did until V5
import type { Context, Note, Params, Patch } from '../synth/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import type { Patches } from './patches.ts';
import { builtNote, type Played } from './sounding.ts';

// a note to play: its pitch, when it sounds, a clock time, how strong, full unless given; its length, with none held open until it's let
// go; a bend, a vibrato, its glides ([[time, pitch]], clock times), a rise, where its patch reads them
export interface NoteToPlay {
  pitch: number;
  t: number;
  velocity?: number | undefined;
  duration?: number | undefined;
  pitchBend?: number | undefined;
  vibrato?: number | undefined;
  pitchGlides?: [number, number][] | undefined;
  rise?: number | undefined;
}
// a note's controls, taking clock times: set(port, value, at, timeConstant) moves a port while it sounds, release(at) lets go of it, its
// note-off; a held note's glide(pitch, at) where its patch has it; and whether it has stopped by now, its sources all stopped, a held
// one never (V3)
export interface NoteControls {
  set: (port: string, value: number, at: number, timeConstant?: number) => void;
  release: (at: number) => void;
  glide?: (pitch: number, at: number) => void;
  stopped: () => boolean;
}

// a note played on a patch, as it plays (patches.ts), into where it goes: planned with its context and params, built from its time, and
// following its patch's edits as it sounds (G0.2b)
export function playNote(
  engine: Engine,
  patches: Patches,
  {
    patch,
    note,
    context,
    params,
    into,
  }: { patch: Patch; note: NoteToPlay; context: Context; params: Params; into: AudioNode },
): NoteControls {
  const start = engine.at(note.t); // a clock time in the audio context's time, never in its past
  const sinceStart = (at: number): number => engine.at(at) - start;
  const sounding = builtNote(engine, { patch, note: noteFor(note, sinceStart), context, params, start, into });
  return controlsOf(patches.sounds(patch, sounding), sinceStart, () => engine.now()); // it follows its patch's edits as it sounds (G0.2b)
}

// the note as the patch plans it: its velocity full and no bend unless given, held open with no length, held when it has a vibrato,
// its glides' times from its start
function noteFor(
  { pitch, velocity = 1, duration, pitchBend = 0, vibrato, pitchGlides, rise }: NoteToPlay,
  sinceStart: (at: number) => number,
): Note {
  return {
    pitch,
    velocity,
    duration,
    held: vibrato != null,
    vibrato,
    pitchBend,
    rise,
    pitchGlides: pitchGlides && pitchGlides.map(([at, to]): [number, number] => [sinceStart(at), to]),
  };
}
// a played note's controls, taking clock times, each told it as the plan it has then makes it, an edit's (G0.2b), its time from its start
// worked out as it's called: set and release, and a held note's glide where its patch has it; whether it has stopped, by the context's
// time now
function controlsOf(played: Played, sinceStart: (at: number) => number, now: () => number): NoteControls {
  const controls: NoteControls = {
    set: (port, value, at, timeConstant) => {
      const since = sinceStart(at);
      played.tell((current) => current.controls.set(port, value, since, timeConstant));
    },
    release: (at) => {
      const since = sinceStart(at);
      played.tell((current) => current.controls.release(since));
    },
    stopped: () => played.stopped(now()),
  };
  if (played.plan.handle?.glide) {
    controls.glide = (to, at) => {
      const since = sinceStart(at);
      played.tell((current) => current.handle?.glide?.(to, since) ?? []); // a structure an edit made may have none
    };
  }
  return controls;
}

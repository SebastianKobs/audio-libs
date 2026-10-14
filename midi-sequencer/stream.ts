// ---------- midi-sequencer/stream: every play, the garden's and yours as you play it, to whoever listens ----------
import type { Seconds } from '../clock/index.ts';
import type { Controller, NoteOff, PerNoteController, PerNoteValues } from '../midi/index.ts';

// a play, as the stream carries it: whose it is, its kind and role, whether it's played as you play it, its notes at clock times; the
// replay track it's on and until when, the clip it's of, the sends it drew, and the seed its draws came from (G0g); the region it's of, a
// number its source hands out (G1a): a replay's its own, your notes their gesture's, a loop's its launch's, a held part's its key's, so
// the plays of one region are told apart from another's of the same element; the ends and glides of notes sent before it, a held note's,
// by the note's index, as MIDI pairs a note off with its note on (G2a), a play with no notes of its own where nothing else came with them;
// and the changes to their per-note controllers, as they're heard from their own place (G3a). A track's own controllers, its parameters
// as they move, a play of their own on the track, no element's (owner null), its kind and number as its replays carry them (G3a)
export interface Play {
  owner: unknown;
  kind: string;
  role?: string;
  live?: boolean;
  notes: PlayedNote[];
  track?: number | null;
  until?: number;
  clip?: unknown;
  sends?: unknown;
  seed?: number;
  region?: number;
  ends?: NoteOff[];
  glides?: NoteGlide[];
  changes?: PerNoteController[];
  controls?: Controller[];
  playback?: boolean; // played back from the recording, left out of it as a launched clip is (P3a)
  hushed?: boolean; // the live garden's held notes hushed and brought back as the arrangement plays back, left out of it too (P3b)
  [more: string]: unknown;
}
// a held note's glide, sent after it (G2a): the note's index, when, and the pitch it goes to, a MIDI note number.
// Its end, the changes to its other per-note controllers and a track's own controllers are carried as sent, MIDI's messages.
export interface NoteGlide {
  index: number;
  t: Seconds;
  pitch: number;
}
// a note as the stream carries it: when it sounds, a clock time, and how long, in seconds, where that came with it; its pitch, a MIDI note
// number, a drum's its pad (the brushes', G0f), and its velocity, 0 to 1 (G3a); what else it was played with (its vibrato, pitch bend and
// glides, its other per-note controllers as it starts, how it's heard from its own place and its own values (G3a), which part of its
// plant); and its index, as its source handed it out, which a later end, glide or change names it by (G2a)
export interface PlayedNote {
  t: Seconds;
  duration?: Seconds | undefined;
  pitch?: number | undefined;
  velocity?: number | undefined;
  vibrato?: number | undefined;
  pitchBend?: number | undefined;
  pitchGlides?: [at: Seconds, pitch: number][] | undefined;
  controllers?: PerNoteValues | undefined;
  part?: number | undefined;
  index?: number | undefined;
  [value: string]: unknown;
}
// a play's listener: a recorder, a session view
export type PlayListener = (play: Play) => void;

// the stream: every play, { owner, kind, role, live, notes: [{ t, pitch, … }] }, to whoever listens; a sequencer's own (L1b), so two
// sequencers are heard apart. onPlay(listener) returns how to stop
export class Stream {
  readonly #listeners = new Set<PlayListener>();

  onPlay(listener: PlayListener): () => boolean {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  played(play: Play): Play {
    for (const listener of this.#listeners) {
      listener(play);
    }
    return play;
  }
}

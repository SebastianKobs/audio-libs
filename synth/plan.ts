// ---------- libs/synth/plan: a note's plan, as data ----------
// A note's plan is an audio plan (libs/audio-plan/), its graph, its output the patch's, mono, with what a voice adds (W0): its ports, its
// controls and its handle.
// An FX module (patch.effect) has an input where an instrument has sources: its chain's first stage, which the plan names (input).
// The plan lists its ports, and has controls for any note, taking times from its start: set(port, value, at, tc) moves a port's params
// to a value, by a target (a knob turned, a controller, while the note sounds); release(at) lets go of a note, its note-off:
// each envelope with a release released from then, no earlier than its shortest, and none once its end has come; its sources stopped once
// they've faded. A sound whose envelopes have no release rings out
import type { AudioPlan, Operation } from '../audio-plan/index.ts';
import type { Seconds } from './values.ts';

// what a sounding note can be told, each by the block that plans it, times in seconds from its start: to glide to a pitch
// (osc), to follow a new tempo (delay)
export interface Handles {
  glide?: (pitch: number, at: Seconds) => Operation[];
  tempo?: (beat: Seconds, at: Seconds) => Operation[];
}
// a note's plan: its graph, and what a voice adds to it
export interface Plan extends AudioPlan {
  handle: Handles | null;
  ports: Record<string, { id: number; param?: string | undefined }[]>; // a node's input, with no param, or a param of it
  controls: {
    set(port: string, value: number, at: number, tc?: number): Operation[];
    release(at: number): Operation[];
  };
}

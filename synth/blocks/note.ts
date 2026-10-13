// ---------- libs/synth/blocks/note: where the note comes in ----------
// As a modular's MIDI-to-CV module, or Ableton's global section (I1e): how far above its note it plays (transpose, in semitones); how fast
// it slides to a note's glides (glide, a time constant); a note's shortest, a release before it waiting for it, and its longest; and
// whether it runs on (continuous: a background, an FX module), starting at once, its velocity full. It builds nothing: the planner reads it
import type { Block } from '../plan-builder.ts';
import type { NoteIn } from '../patch.ts';
import type { ParamSpecs } from '../params.ts';

// its values (params.ts)
export const NOTE_SPECS = {
  transpose: { name: 'transpose', unit: 'semitones', range: [-24, 24, 1], default: 0 },
  glide: { name: 'glide', unit: 's', range: [0, 1, 0.001] },
  shortest: { name: 'shortest', unit: 's', range: [0, 1, 0.01], default: 0 },
  longest: { name: 'longest', unit: 's', range: [0.1, 10, 0.01] },
} as const satisfies ParamSpecs;

export default {
  key: 'note',
  paramSpecs: NOTE_SPECS,
  plan() {}, // the planner reads it, before the blocks plan
} satisfies Block<NoteIn>;

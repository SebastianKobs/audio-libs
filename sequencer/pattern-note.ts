// ---------- libs/sequencer/pattern-note: a pattern's note, the music's: its pitch, its step of the scale, its phrase, its vibrato ----------
import type { Pattern, PatternEvent } from './pattern.ts';

// a note of a pattern: an event, and what else its pattern gives it: a step of the scale from the pattern's own note, a note number of its
// own, a drum's (the brushes'), the phrase of a record it's in, its vibrato; and what a record keeps beside (where it was swung, its
// bulb, segment or leaf, its shape, its glides), the garden's own
export interface PatternNote extends PatternEvent {
  step?: number | undefined;
  pitch?: number | undefined;
  phrase?: number | undefined;
  vibrato?: number | undefined; // a field given as undefined is one not given: a record keeps its pattern's, which may have none
}
// a pattern of notes, and its rhythm's shape and vibrato, as a theme's bank gives them
export interface NotePattern extends Pattern<PatternNote> {
  shape?: string;
  vibrato?: number;
}

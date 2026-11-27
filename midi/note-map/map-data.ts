// ---------- midi/note-map/map-data: a note map as data, as a file holds it ----------
// instrument → articulation → variant → a MIDI note, with a controller's value to send with it where one is given. An instrument
// may fall back to another, an articulation to another of its instrument, and a variant falls back to either.

// a variant of an articulation: a hand, right, left or either, or a direction, up or down
export type Variant = 'right' | 'left' | 'either' | 'up' | 'down';
// a controller's number and the value to send with a note, both 0 to 127
export interface NoteController {
  number: number;
  value: number;
}
// a variant's note, 0 to 127, and the controller value sent with it, where there is one
export interface VariantNote {
  note: number;
  controller?: NoteController;
}
// an articulation: its notes by variant, and the articulation of its instrument it falls back to
export interface ArticulationData {
  fallback?: string;
  variants?: Partial<Record<Variant, VariantNote>>;
}
// an instrument: its articulations by name, and the instrument it falls back to
interface InstrumentData {
  fallback?: string;
  articulations: Record<string, ArticulationData>;
}
// a note map: its instruments by name
export interface NoteMapData {
  instruments: Record<string, InstrumentData>;
}

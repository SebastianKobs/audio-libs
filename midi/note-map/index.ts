// ---------- midi/note-map: a note map as data, instrument → articulation → variant → a MIDI note, with fallbacks (its entry) ----------
// Its parts:
//   - map-data.ts: the map as data, as a file holds it;
//   - loader.ts: the map read from data at the edge, its shape, its values and its fallbacks checked;
//   - note-map.ts: a note looked up, and the fallbacks taken to it.
export { loadNoteMap } from './loader.ts';
export { type NoteMap, type FoundNote, type Fallback } from './note-map.ts';
export { type NoteMapData, type NoteController, type Variant } from './map-data.ts';

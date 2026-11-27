// ---------- formats/midi-file: Standard MIDI Files read and written, bytes in and bytes out (its entry) ----------
// Its parts:
//   - tracks.ts: what a file holds, its tracks' notes and controllers, its tempo map and time signatures, in ticks;
//   - encode.ts: a file's bytes from its tracks;
//   - decode.ts: a file's tracks from its bytes, malformed ones refused;
//   - byte-reader.ts and variable-length.ts: bytes read in order, and a delta time's form.
export { encodeMidiFile } from './encode.ts';
export { decodeMidiFile } from './decode.ts';
export {
  type MidiFile,
  type MidiTrack,
  type MidiNote,
  type ControllerChange,
  type TempoChange,
  type TimeSignatureChange,
} from './tracks.ts';

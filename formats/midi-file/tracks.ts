// ---------- formats/midi-file/tracks: what a Standard MIDI File holds, as values in ticks ----------
// A file's time is in ticks, its ppq to a quarter note; a tempo says how long a quarter is from its tick on. The tempo map and the
// time signatures are the whole file's, written into its first track; a channel is 0 to 15, as its byte has it, 9 General MIDI's drums.

// a file: format 0, one track, or 1, tracks played together; its ticks to a quarter; its tracks; its tempo map and time signatures
export interface MidiFile {
  format: 0 | 1;
  ppq: number;
  tracks: readonly MidiTrack[];
  tempos: readonly TempoChange[];
  timeSignatures: readonly TimeSignatureChange[];
}
// a track's notes and controllers, each in time order as read
export interface MidiTrack {
  notes: readonly MidiNote[];
  controllers: readonly ControllerChange[];
}
// a note: its start and length in ticks, its pitch and velocity, 1 to 127, and its channel
export interface MidiNote {
  tick: number;
  duration: number;
  pitch: number;
  velocity: number;
  channel: number;
}
// a controller's change: its number and value, 0 to 127, on a channel
export interface ControllerChange {
  tick: number;
  controller: number;
  value: number;
  channel: number;
}
// a tempo from a tick on, as the file has it: microseconds to a quarter, 500 000 at 120 bpm, 60 000 000 / bpm
export interface TempoChange {
  tick: number;
  microsecondsPerQuarter: number;
}
// a time signature from a tick on: 7/8 its numerator 7, its denominator 8
export interface TimeSignatureChange {
  tick: number;
  numerator: number;
  denominator: number;
}

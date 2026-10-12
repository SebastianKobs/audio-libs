// ---------- sequencer/messages: what a control surface plays into the sequencer, MIDI 2.0's channel voice messages as values ----------
// MIDI 2.0's model and names, not its packets (M2-104-UM): the app's values, a velocity 0 to 1, a pitch a MIDI note number, each at a
// clock time. A note's index is its note number as its source hands it out (rotation.ts), so two notes of one pitch keep apart. Each
// kind comes with the step that first sends it (G0, mockup/architecture/done.md): note on and note off with your taps (G0a), per-note
// controllers and per-note management with how a note is heard (G0b), controllers with a replay track's (G0d). A controller's change,
// a per-note one's too, carries how it moves there, as an automation point's curve: jumping at its time, or gliding from it by a time
// constant (glide), so what's recorded plays back as it was heard
import type { Seconds } from '../clock/index.ts';

// a note that starts: its index, pitch and velocity; which part of its clip's element sounds it (a bulb, a leaf, a crystal)
export interface NoteOn {
  type: 'note on';
  index: number;
  pitch: number;
  velocity: number;
  t: Seconds;
  part?: number | undefined;
}
// a note let go: its index, sent with its note on where its length is known as it starts
export interface NoteOff {
  type: 'note off';
  index: number;
  t: Seconds;
}
// a note's per-note controllers, each in its own units, not MIDI's numbers. MIDI 2.0's registered ones (M2-104-UM, Appendix A, Table 11):
// those a note is heard by, #7 Volume a gain, #10 Pan from -1 to 1, #74 Brightness a lowpass's cutoff in Hz, #91 Effects 1 Depth its
// reverb send's gain; #77 Vibrato Depth in cents; #3 Pitch 7.25, a MIDI note number, which the spec gives a sender that controls a note's
// pitch all its life, its glides too (4.2.14). And assignable ones, by name, a note's own values: its rise, in seconds, how long a drone
// swells (G0c); its bend, in semitones, where it slides in from (G0d2)
export type PerNoteControllerName =
  'volume' | 'pan' | 'brightness' | 'effects 1 depth' | 'vibrato depth' | 'pitch' | 'rise' | 'bend';
// a note's per-note controllers' values, by name
export type PerNoteValues = Partial<Record<PerNoteControllerName, number>>;
// one of a note's per-note controllers: sent with its note on, its value as it starts; sent later, a change
export interface PerNoteController {
  type: 'per-note controller';
  index: number;
  controller: PerNoteControllerName;
  value: number;
  t: Seconds;
  glide?: Seconds | undefined;
}
// one of a track's controllers: a parameter of the track's by its name, as a controller's knob is mapped to one in Ableton, in its units
// (G0d), as the track's instrument maps it
export interface Controller {
  type: 'controller';
  controller: string;
  value: number;
  t: Seconds;
  glide?: Seconds | undefined;
}
// per-note management, its detach flag set: the note's per-note controllers detached from it, sent once it has rung out, so its index
// can be handed out again (MIDI 2.0's reset flag comes when a step needs it)
export interface PerNoteManagement {
  type: 'per-note management';
  index: number;
  detach: true;
  t: Seconds;
}
export type Message = NoteOn | NoteOff | PerNoteController | Controller | PerNoteManagement;
// a note as its messages give it: its note on, its length where its note off came with it, its per-note controllers sent with it, its
// values as it starts, and its #3 Pitch changes sent with it, its glides, each [when, pitch] (G0d2)
export interface SentNote {
  noteOn: NoteOn;
  duration: Seconds | undefined;
  controllers: PerNoteValues;
  glides: [at: Seconds, pitch: number][];
}

// the notes among the messages, each with its length where its note off is among them too, and its per-note controllers among them
export function notesIn(messages: readonly Message[]): SentNote[] {
  const noteOffs = messages.filter((message) => message.type === 'note off');
  const controllers = messages.filter((message) => message.type === 'per-note controller');
  return messages
    .filter((message) => message.type === 'note on')
    .map((noteOn) => ({
      noteOn,
      duration: durationOf(noteOn, noteOffs),
      controllers: controllersOf(noteOn, controllers),
      glides: glidesOf(noteOn, controllers),
    }));
}
function durationOf(noteOn: NoteOn, noteOffs: readonly NoteOff[]): Seconds | undefined {
  const noteOff = noteOffs.find((off) => off.index === noteOn.index);
  if (!noteOff) {
    return undefined;
  }
  return noteOff.t - noteOn.t;
}
function controllersOf(noteOn: NoteOn, controllers: readonly PerNoteController[]): PerNoteValues {
  const its = controllers.filter((sent) => sent.index === noteOn.index && sent.controller !== 'pitch');
  return Object.fromEntries(its.map((sent) => [sent.controller, sent.value]));
}
function glidesOf(noteOn: NoteOn, controllers: readonly PerNoteController[]): [Seconds, number][] {
  const its = controllers.filter((sent) => sent.index === noteOn.index && sent.controller === 'pitch');
  return its.map((sent): [Seconds, number] => [sent.t, sent.value]);
}

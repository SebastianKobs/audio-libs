// ---------- libs/web-audio-synth/instrument: an instrument, messages in, its patch's notes out of its output (V3) ----------
// As a bass, a keyboard or a rack synth is one: MIDI 2.0's channel voice messages in (libs/midi/), whoever sends them, a keyboard or a
// sequencer; its notes out of its output, patched as it's made, into a desk, say, and, where it answers #91 Effects 1 Depth, each note's
// room out of a second, as a multi-out synth's: where they go handed in, no node of its own, so what it builds is only its voices and
// their stages (V4). Each note a voice of the patch it plays, from a bank (patches.ts), by name, as
// MIDI's program change picks one, so an edit to it reaches every note of it that sounds, any instrument's; held until its note off lets
// it go, one sent with it too, as a keyboard plays a synth (G0i2). Its knobs (params), the tempo (beat) and its draws (random) handed in,
// read as each note starts. The per-note controllers it answers each a stage of the note's own (note-stages.ts), set as the note starts
// and glided to by a change that comes later, from its time; let go once its sender detaches the note, or once its voice has stopped, as
// the next note starts, so a sender that never detaches leaves none behind. #7 Volume with no stage for it sets the voice's own out, times
// its patch's own volume, as a background's held note is hushed (P3b). A track's controllers aren't its: whoever plays it maps them
import { notesIn, type Message, type PerNoteController, type Receiver, type SentNote } from '../midi/index.ts';
import { volumeOf, type Params } from '../synth/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import { NoteStages, type StageController } from './note-stages.ts';
import type { Patches } from './patches.ts';
import { playNote, type NoteControls, type NoteToPlay } from './play.ts';

// a note as it sounds: its index, its voice's controls, and its own stages where its instrument answers any
interface Voice {
  index: number;
  controls: NoteControls;
  stages: NoteStages | null;
}

export class Instrument implements Receiver {
  readonly #engine: Engine;
  readonly #patches: Patches;
  readonly #patch: string;
  readonly #params: () => Params;
  readonly #beat: () => number;
  readonly #random: () => number;
  readonly #answers: readonly StageController[];
  readonly #into: AudioNode;
  readonly #effects: AudioNode | null;
  readonly #voices = new Map<number, Voice>(); // each note as it sounds, by its index
  readonly #sounding = new Set<Voice>(); // every voice not yet let go, one whose index a new note has taken too

  // patch: the bank's patch it plays, by name. params: its knobs, as a note starts. beat: a beat's length now. random: its draws, its own
  // where they're kept apart, else Math.random's. answers: the per-note controllers it answers, a stage each, none unless it says. into:
  // where its output goes; effects: its second's, each note's room, where it answers #91 Effects 1 Depth
  constructor({
    engine,
    patches,
    patch,
    params = () => ({}),
    beat,
    random = Math.random,
    answers = [],
    into,
    effects = null,
  }: {
    engine: Engine;
    patches: Patches;
    patch: string;
    params?: () => Params;
    beat: () => number;
    random?: () => number;
    answers?: readonly StageController[];
    into: AudioNode;
    effects?: AudioNode | null;
  }) {
    if (!patches.of(patch)) {
      throw new Error(`no patch ${patch}: the bank has none by that name`);
    }
    this.#engine = engine;
    this.#patches = patches;
    this.#patch = patch;
    this.#params = params;
    this.#beat = beat;
    this.#random = random;
    this.#answers = answers;
    this.#into = into;
    this.#effects = effects;
  }
  // the messages handed it, at once: each note on a voice, a note off letting its note go, one sent with it too; a per-note controller sent
  // with its note planned into it, one sent later a change; a note detached, its stages let go
  receive(messages: readonly Message[]): void {
    const started = notesIn(messages);
    for (const note of started) {
      this.#start(note);
    }
    const startedNow = new Set(started.map(({ noteOn }) => noteOn.index));
    for (const message of messages) {
      if (message.type === 'note off') {
        this.#voices.get(message.index)?.controls.release(message.t);
      } else if (message.type === 'per-note controller' && !startedNow.has(message.index)) {
        this.#changed(message);
      } else if (message.type === 'per-note management') {
        this.#detached(message.index);
      }
    }
  }
  // a note on a voice of its patch as the bank has it now, into its stages, those its per-note controllers set as it starts, or out of
  // its output; any rung out let go first
  #start(note: SentNote): void {
    this.#letGoOfStopped();
    const stages =
      this.#answers.length ?
        new NoteStages(this.#engine, {
          into: this.#into,
          room: this.#effects,
          heard: note.controllers,
          answers: this.#answers,
        })
      : null;
    const controls = playNote(this.#engine, this.#patches, {
      patch: this.#patches.of(this.#patch)!, // one the bank has, as it was made
      note: noteOf(note),
      context: { beat: this.#beat(), random: this.#random },
      params: this.#params(),
      into: stages ? stages.input : this.#into,
    }); // it follows its patch's edits as it sounds (G0.2b)
    const voice = { index: note.noteOn.index, controls, stages };
    this.#voices.set(voice.index, voice);
    this.#sounding.add(voice);
  }
  // a note's controller changed as it sounds: its pitch, #3 Pitch 7.25, glides its voice there at its time, where its patch has a glide;
  // #7 Volume with no stage for it its voice's out, times its patch's own volume (P3b); another glides its stage by the time constant it
  // comes with, or with none sets it, from its time
  #changed({ index, controller, value, t, glide }: PerNoteController): void {
    const voice = this.#voices.get(index);
    if (!voice) {
      return;
    }
    if (controller === 'pitch') {
      voice.controls.glide?.(value, t);
      return;
    }
    if (controller === 'volume' && !this.#answers.includes('volume')) {
      const own = volumeOf(this.#patches.of(this.#patch)!.out); // one the bank has
      voice.controls.set('out.volume', own * value, t, glide);
      return;
    }
    voice.stages?.glide(controller, value, glide ?? 0, this.#engine.at(t));
  }
  // a note its sender has detached, rung out: its stages let go
  #detached(index: number): void {
    const voice = this.#voices.get(index);
    if (voice) {
      this.#letGo(voice);
    }
  }
  // the voices that have stopped, let go
  #letGoOfStopped(): void {
    for (const voice of this.#sounding) {
      if (voice.controls.stopped()) {
        this.#letGo(voice);
      }
    }
  }
  #letGo(voice: Voice): void {
    voice.stages?.letGo();
    this.#sounding.delete(voice);
    if (this.#voices.get(voice.index) === voice) {
      this.#voices.delete(voice.index);
    }
  }
}

// a note as its messages give it, as its patch plays it: its pitch, time and velocity, held, with no length, until its note off lets it
// go; its own values sent with it as per-note controllers, a drone's rise, a phrase note's bend and vibrato depth; and its glides, its #3
// Pitch changes sent with it (G0d2)
function noteOf({ noteOn, controllers, glides }: SentNote): NoteToPlay {
  return {
    pitch: noteOn.pitch,
    t: noteOn.t,
    velocity: noteOn.velocity,
    rise: controllers.rise,
    pitchBend: controllers.bend,
    vibrato: controllers['vibrato depth'],
    pitchGlides: glides.length ? glides : undefined,
  };
}

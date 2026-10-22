// ---------- libs/music/scale-device/scale-device: a MIDI insert mapping each note from the key it arrives in into the key chosen ----------
// On a track, around its part's input, so everything on the track passes it, as a delay sits on its audio's way.
// Its key a choice among the keys handed in, by name; a key controller carries the choice's index (base/params).
// Each note's shift is kept by its index, as the instrument keeps its voices: from its note on, until its detach.
import type { ParamSpec } from '../../base/params/index.ts';
import { choiceAt } from '../../base/params/index.ts';
import type { Message, NoteOn, PerNoteController, Receiver } from '../../sequencing/midi/index.ts';
import type { Key } from '../music-theory/index.ts';
import { shiftInto } from './steps.ts';

// what the device is handed: its keys by name, the one it starts in, the key its notes arrive in, what it plays into
export interface ScaleDeviceSetup {
  readonly keys: Readonly<Record<string, Key>>;
  readonly start: string;
  readonly from: Key;
  readonly into: Receiver;
}

export class ScaleDevice implements Receiver {
  // the key param, as a plugin declares it: its choices the keys' names
  readonly spec: ParamSpec;
  readonly #keys: Readonly<Record<string, Key>>;
  readonly #from: Key;
  readonly #into: Receiver;
  #key: Key;
  readonly #shifts = new Map<number, number>(); // each note's shift by its index

  constructor({ keys, start, from, into }: ScaleDeviceSetup) {
    this.#keys = keys;
    this.#from = from;
    this.#into = into;
    this.#key = keyNamed(keys, start);
    this.spec = { name: 'key', choices: Object.keys(keys), default: start };
  }
  // the messages handed it, in their order, passed on at once: a key controller sets the key for the
  // notes after it in the batch, and is not passed on
  receive(messages: readonly Message[]): void {
    this.#into.receive(messages.flatMap((message) => this.#through(message)));
  }
  // a message as it passes on: none for a key controller, moved for a note or a glide, else as it was
  #through(message: Message): Message[] {
    if (message.type === 'controller' && message.controller === this.spec.name) {
      this.#chooseAt(message.value);
      return [];
    }
    if (message.type === 'note on') {
      return [this.#noteOn(message)];
    }
    if (message.type === 'per-note controller' && message.controller === 'pitch') {
      return [this.#glide(message)];
    }
    if (message.type === 'per-note management') {
      this.#shifts.delete(message.index);
    }
    return [message];
  }
  // a note on, its pitch moved into the key chosen, its shift kept by its index
  #noteOn(noteOn: NoteOn): NoteOn {
    const shift = shiftInto(noteOn.pitch, this.#from, this.#key);
    this.#shifts.set(noteOn.index, shift);
    return { ...noteOn, pitch: noteOn.pitch + shift };
  }
  // a glide moved by its own note's shift; a note not seen has none
  #glide(glide: PerNoteController): PerNoteController {
    return { ...glide, value: glide.value + (this.#shifts.get(glide.index) ?? 0) };
  }
  // the key from the next note on: the choice's index rounded, as a controller's place is
  #chooseAt(index: number): void {
    this.#key = keyNamed(this.#keys, choiceAt(this.spec, index));
  }
}

// a key by its name among those handed in
function keyNamed(keys: Readonly<Record<string, Key>>, name: string): Key {
  const key = keys[name];
  if (key === undefined) {
    throw new Error(`no key named ${name}`);
  }
  return key;
}

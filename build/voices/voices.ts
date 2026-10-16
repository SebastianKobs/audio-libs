// ---------- build/voices/voices: MIDI's notes played into an instrument ----------
// What MIDI's notes are played into (a Receiver): an instrument's voices juggled on what's built.
//   1. A note on: a copy of its pool's voice card added at its time, a drum rack's pad's by its key;
//      its note's sources set by the pool's addresses, its frequency, its velocity, the per-note
//      controllers sent with it; its gate opened last; its glides by its voice card's glide.
//   2. A note off: its gate closed, no sooner than its shortest; one with no end closed at its longest.
//   3. A per-note controller sent later: a change at its time; its pitch glided.
//   4. A voice let go once it has rung out, as the next messages come (silence.ts); at once where
//      its note is detached.
// No sound of its own: what's built makes it.
import type { When } from '../../automation/index.ts';
import { notesIn, type Message, type PerNoteController, type Receiver, type SentNote } from '../../midi/index.ts';
import { mtof } from '../../music-theory/index.ts';
import { isComposite, type Address, type Composite, type Plan, type Pool } from '../../plan/format/index.ts';
import { NOTE_SETTINGS } from '../../plan/synth/index.ts';
import type { Built } from '../ports/index.ts';
import { Silence } from './silence.ts';

// a note's settings, its voice card's or their defaults
type NoteSettings = Record<keyof typeof NOTE_SETTINGS, number>;
// an instrument's pool as its voices play it: its voice card's silence and note settings
interface Played {
  readonly pool: Pool;
  readonly silence: Silence;
  readonly settings: NoteSettings;
}
// a note's voice: its copy's address, its pool, when it started, and when its gate closes, once known
interface Voice {
  readonly index: number;
  readonly copy: Address;
  played: Played;
  readonly start: number;
  end: number | undefined;
}

export class Voices implements Receiver {
  readonly #built: Built;
  readonly #now: () => number;
  #pools: Played[];
  readonly #numbers = new Map<string, number>(); // each pool's last copy's number, by its child's name
  readonly #sounding = new Set<Voice>();
  readonly #byIndex = new Map<number, Voice>();

  constructor(built: Built, plan: Plan, now: () => number) {
    this.#built = built;
    this.#pools = playedOf(plan);
    this.#now = now;
  }
  // the messages handed it, at once: any voice rung out let go first; then each note on a voice,
  // each note off closing its gate, each per-note controller sent later a change, a note detached let go
  receive(messages: readonly Message[]): void {
    this.#letGoOfRungOut();
    const started = notesIn(messages);
    started.forEach((note) => this.#start(note));
    const startedNow = new Set(started.map(({ noteOn }) => noteOn.index));
    for (const message of messages) {
      if (message.type === 'note off') {
        this.#end(message.index, message.t);
      } else if (message.type === 'per-note controller' && !startedNow.has(message.index)) {
        this.#changed(message);
      } else if (message.type === 'per-note management') {
        this.#detached(message.index);
      }
    }
  }
  // Built again from a changed plan: each sounding note's gate told again at its own time, so its
  // envelopes are where they'd be.
  rebuild(plan: Plan): void {
    this.#built.rebuild(plan);
    this.#pools = playedOf(plan);
    for (const voice of this.#sounding) {
      voice.played = this.#pools.find(({ pool }) => pool.child.name === voice.played.pool.child.name)!; // its pool kept
      this.#set(voice, 'gate', 1, { at: voice.start });
      if (voice.end !== undefined) {
        this.#set(voice, 'gate', 0, { at: voice.end });
      }
    }
  }

  // A note on a voice of its pool: its sources set as it starts, its gate opened last, its glides;
  // with no end yet, closed at its longest. None where no pool plays it.
  #start({ noteOn, controllers, glides }: SentNote): void {
    const played =
      this.#pools.find(({ pool }) => pool.key === noteOn.pitch)
      ?? this.#pools.find(({ pool }) => pool.key === undefined);
    if (!played) {
      return;
    }
    const name = played.pool.child.name;
    const number = (this.#numbers.get(name) ?? 0) + 1;
    this.#numbers.set(name, number);
    const voice: Voice = { index: noteOn.index, copy: [name, String(number)], played, start: noteOn.t, end: undefined };
    this.#built.add(voice.copy, noteOn.t);
    const values: Record<string, number | undefined> = {
      ...controllers,
      frequency: mtof(noteOn.pitch),
      velocity: noteOn.velocity,
    };
    for (const source of Object.keys(played.pool.note ?? {})) {
      const value = values[source];
      if (value !== undefined) {
        this.#set(voice, source, value, { at: noteOn.t });
      }
    }
    this.#set(voice, 'gate', 1, { at: noteOn.t });
    for (const [at, pitch] of glides) {
      this.#pitched(voice, pitch, at);
    }
    this.#closed(voice, noteOn.t + played.settings.longest);
    this.#sounding.add(voice);
    this.#byIndex.set(voice.index, voice);
  }
  // a note off: its gate closed at its time, no sooner than its shortest
  #end(index: number, t: number): void {
    const voice = this.#byIndex.get(index);
    if (voice) {
      this.#closed(voice, Math.max(t, voice.start + voice.played.settings.shortest));
    }
  }
  // its gate closed at a time, where it isn't by then
  #closed(voice: Voice, at: number): void {
    if (voice.end !== undefined && voice.end <= at) {
      return;
    }
    voice.end = at;
    this.#set(voice, 'gate', 0, { at });
  }
  // a per-note controller sent later: its pitch glided there; another set at its time, gliding as it says
  #changed({ index, controller, value, t, glide }: PerNoteController): void {
    const voice = this.#byIndex.get(index);
    if (!voice) {
      return;
    }
    if (controller === 'pitch') {
      this.#pitched(voice, value, t);
      return;
    }
    this.#set(voice, controller, value, glide === undefined ? { at: t } : { at: t, glide });
  }
  // its frequency to a pitch at a time, glided by its voice card's glide; with none, at once
  #pitched(voice: Voice, pitch: number, at: number): void {
    const { glide } = voice.played.settings;
    this.#set(voice, 'frequency', mtof(pitch), glide > 0 ? { at, glide } : { at });
  }
  // one of its note's sources set, by each of its pool's addresses for it; none where it has none
  #set(voice: Voice, source: string, value: number, when: When): void {
    for (const address of voice.played.pool.note?.[source] ?? []) {
      this.#built.set([...voice.copy, ...address], value, when);
    }
  }
  // a note detached by its sender, rung out: its voice let go
  #detached(index: number): void {
    const voice = this.#byIndex.get(index);
    if (voice) {
      this.#letGo(voice);
    }
  }
  // every voice rung out by now, let go
  #letGoOfRungOut(): void {
    const now = this.#now();
    for (const voice of this.#sounding) {
      const faded = (address: Address): number => this.#built.faded([...voice.copy, ...address]);
      if (voice.played.silence.silentFrom(faded, voice.end) <= now) {
        this.#letGo(voice);
      }
    }
  }
  #letGo(voice: Voice): void {
    this.#built.letGo(voice.copy);
    this.#sounding.delete(voice);
    if (this.#byIndex.get(voice.index) === voice) {
      this.#byIndex.delete(voice.index);
    }
  }
}

// an instrument's pools as its voices play them, each its voice card's silence and note settings
function playedOf(plan: Plan): Played[] {
  const pools = isComposite(plan.node) ? plan.node.pools : [];
  return pools.map((pool) => {
    const card = pool.child as Composite; // a voice card: a composite
    return { pool, silence: new Silence(card), settings: settingsOf(card) };
  });
}
// a voice card's note settings: its own, macros with no targets, or their defaults
function settingsOf(card: Composite): NoteSettings {
  const entries = Object.entries(NOTE_SETTINGS).map(([name, spec]) => {
    const own = card.macros.find((macro) => macro.spec.name === name)?.value;
    return [name, typeof own === 'number' ? own : spec.default];
  });
  return Object.fromEntries(entries) as NoteSettings;
}

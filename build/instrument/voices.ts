// ---------- build/instrument/voices: MIDI's notes played into an instrument ----------
// What MIDI's notes are played into (a Receiver): an instrument's voices juggled on what's built.
//   1. A note on: a copy of its pool's voice card added at its time, a drum rack's pad's by its key;
//      its note's sources set by the pool's addresses as it's added, before it sounds, as a voice is
//      built at them: its frequency, its velocity, the per-note controllers sent with it; its gate
//      opened last, at its time; its glides by its voice card's glide.
//   2. A note off: its gate closed, no sooner than its shortest; a note held until its note off,
//      closed at its longest only where its voice card has one.
//   3. A per-note controller sent later: a change at its time; its pitch glided.
//   4. As its gate closes, its sources stopped by when it's silent, where that's known
//      (silence.ts); let go once it has rung out, as the next messages come; at once where its
//      note is detached.
// Its voice cards' own values, a knob's or an edit's, by their addresses in the instrument
// ('voice/cutoff', 'pad 38/env 1/decay'), where a voice card has them:
//   - read and set on each voice as it's added, before its sources;
//   - an edit set on every voice of its card still sounding, gliding.
// No sound of its own: what's built makes it.
import { SMOOTHING, type When } from '../../automation/index.ts';
import { notesIn, type Message, type PerNoteController, type Receiver, type SentNote } from '../../midi/index.ts';
import { mtof } from '../../music-theory/index.ts';
import {
  isComposite,
  macroIn,
  paramAt,
  type Composite,
  type Plan,
  type Pool,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import { addressOf, type Address } from '../../util/index.ts';
import { NOTE_SETTINGS } from '../../plan/instrument/index.ts';
import type { Built } from '../contract/index.ts';
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
  readonly #own: () => ValuesByAddress;
  #plan: Plan;
  #pools: Played[];
  readonly #numbers = new Map<string, number>(); // each pool's last copy's number, by its child's name
  readonly #sounding = new Set<Voice>();
  readonly #byIndex = new Map<number, Voice>();

  // own: its voice cards' own values, by their addresses in the instrument, as each voice is added
  constructor(built: Built, plan: Plan, now: () => number, own: () => ValuesByAddress = () => ({})) {
    this.#built = built;
    this.#plan = plan;
    this.#pools = playedOf(plan);
    this.#now = now;
    this.#own = own;
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
    this.#plan = plan;
    this.#pools = playedOf(plan);
    for (const voice of this.#sounding) {
      voice.played = this.#pools.find(({ pool }) => pool.child.name === voice.played.pool.child.name)!; // its pool kept
      this.#set(voice, 'gate', 1, { at: voice.start });
      if (voice.end !== undefined) {
        this.#gateClosed(voice, voice.end);
      }
    }
  }

  // an edit of its voice cards' own values: any voice rung out let go first, then set on every
  // voice of its card sounding, gliding there
  edit(values: ValuesByAddress): void {
    this.#letGoOfRungOut();
    for (const voice of this.#sounding) {
      this.#owned(voice, values, { glide: SMOOTHING });
    }
  }

  // A note on a voice of its pool: its sources set as it starts, its gate opened last, its glides;
  // held until its note off, closed at its longest where it has one. None where no pool plays it.
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
    this.#owned(voice, this.#own(), {}); // now: a fresh copy, silent until its time
    const values: Record<string, number | undefined> = {
      ...controllers,
      frequency: mtof(noteOn.pitch),
      velocity: noteOn.velocity,
    };
    for (const source of Object.keys(played.pool.note ?? {})) {
      const value = values[source];
      if (value !== undefined) {
        this.#set(voice, source, value, {}); // now: a fresh copy, silent until its time
      }
    }
    this.#set(voice, 'gate', 1, { at: noteOn.t });
    for (const [at, pitch] of glides) {
      this.#pitched(voice, pitch, at);
    }
    if (played.settings.longest > 0) {
      this.#closed(voice, noteOn.t + played.settings.longest);
    }
    this.#sounding.add(voice);
    this.#byIndex.set(voice.index, voice);
  }
  // its voice card's own values set on a voice, those under its card where its card has them
  #owned(voice: Voice, values: ValuesByAddress, when: When): void {
    const card = voice.played.pool.child.name;
    for (const [text, value] of Object.entries(values)) {
      const [under, ...within] = addressOf(text);
      if (under === card && paramAt(this.#plan, [card, ...within])) {
        this.#built.set([...voice.copy, ...within], value, when);
      }
    }
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
    this.#gateClosed(voice, at);
  }
  // its gate closed at a time; its sources stopped by when it's silent, where that's known
  #gateClosed(voice: Voice, at: number): void {
    this.#set(voice, 'gate', 0, { at });
    const silent = this.#silentFrom(voice);
    if (silent < Infinity) {
      this.#built.stopBy(voice.copy, silent);
    }
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
      if (this.#silentFrom(voice) <= now) {
        this.#letGo(voice);
      }
    }
  }
  // when a voice is silent for good, as what's built says of its envelopes now
  #silentFrom(voice: Voice): number {
    const faded = (address: Address): number => this.#built.faded([...voice.copy, ...address]);
    return voice.played.silence.silentFrom(faded, voice.end);
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
    const own = macroIn(card, [name])?.value;
    return [name, typeof own === 'number' ? own : spec.default];
  });
  return Object.fromEntries(entries) as NoteSettings;
}

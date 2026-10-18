// ---------- view/models/instrument-racks: the instruments as the device view shows them ----------
// Each role's instrument a rack of its cards, a pad each, read through a port (InstrumentPort).
// The test note every instrument plays, set once for all:
//   - its pitch and velocity, MIDI 1.0's at the edge, as its row sets them;
//   - the note's own values, from their defaults, the starts handed in over them;
//   - held for as long as its button is, from a little after now.
// Which of the note's own values a role's instrument reads, for its row to grey the others.
import { OWN_NOTE_VALUES, type PresetMessage } from '../../plan/synth/index.ts';
import type { Clock } from '../../clock/index.ts';
import type { InstrumentCard } from './cards.ts';
import type { ModelPort } from './model.ts';
import { ViewBuilder } from './view-builder.ts';

// A test note as it's played: its pitch, its velocity, 0 to 1, when, and its own values by
// the note's sources' names, as its row sets them. Its length: as long as it's held.
export interface TestNote {
  pitch: number;
  velocity: number;
  t: number;
  values: Readonly<Record<string, number>>;
}
// a test note as it's held: let go at a time
export interface HeldNote {
  release: (at: number) => void;
}
// The instruments as the device view asks them:
//   - the patch each role plays (instruments);
//   - a role's instrument's cards, one for each patch it plays;
//   - a test note on a role's instrument.
export interface InstrumentPort {
  readonly instruments: Readonly<Record<string, string | undefined>>;
  cardsOf(role: string): readonly InstrumentCard[];
  playTestNote(role: string, note: TestNote): HeldNote;
}
// A role's instrument as a rack: its status, the patch it plays; a pad for each card, by its
// key and its patch, its models.
export interface InstrumentRack {
  readonly key: string;
  readonly status: string;
  readonly pads: readonly { readonly name: string; readonly patch: string; readonly models: ViewBuilder }[];
}

// a little after now, so a test note's start and end are scheduled, not late
const AHEAD = 0.02; // s, on the clock

export class InstrumentRacks {
  // MIDI 1.0's pitch and velocity, at the edge: as its row sets them
  readonly note = { pitch: 62, velocity: 127 };
  readonly values: Record<string, number>; // the test note's own, by the note's sources' names
  readonly #port: InstrumentPort;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #send: (message: PresetMessage) => void;
  readonly #models = new WeakMap<ModelPort, ViewBuilder>(); // each card's, made as first asked for
  #held: HeldNote | null = null; // the test note: held for as long as its button is

  // send(): a reset sent on the app's bus
  // starts: the test note's own values as it starts, by their names, over their defaults
  constructor({
    port,
    clock,
    send,
    starts,
  }: {
    port: InstrumentPort;
    clock: Pick<Clock, 'now'>;
    send: (message: PresetMessage) => void;
    starts: Readonly<Record<string, number>>;
  }) {
    this.#port = port;
    this.#clock = clock;
    this.#send = send;
    this.values = Object.fromEntries(
      OWN_NOTE_VALUES.map(({ name, default: start }) => [name, starts[name] ?? Number(start ?? 0)]),
    );
  }
  // A role's instrument as a rack of its cards; none for a role with no instrument.
  rackOf(role: string): InstrumentRack | null {
    const cards = this.#port.cardsOf(role);
    if (!cards.length) {
      return null;
    }
    const pads = cards.map(({ key, patch, port }) => ({
      name: `${key}: ${patch}`,
      patch,
      models: this.#modelsOf(port),
    }));
    return { key: role, status: `${role}: ${this.#port.instruments[role]}`, pads };
  }
  // A role's instrument back as it was: every card of its patches put back.
  reset(role: string): void {
    for (const { patch } of this.#port.cardsOf(role)) {
      this.#send({ type: 'preset reset', patch });
    }
  }
  // The test note pressed on a role's instrument, its values as they are now.
  press(role: string): void {
    this.#held = this.#port.playTestNote(role, {
      pitch: this.note.pitch,
      velocity: this.note.velocity / 127,
      t: this.#clock.now() + AHEAD,
      values: { ...this.values },
    });
  }
  lift(): void {
    if (!this.#held) {
      return;
    }
    this.#held.release(this.#clock.now() + AHEAD);
    this.#held = null;
  }
  // whether a role's instrument reads one of the note's own values: a card of its has it
  reads(role: string, name: string): boolean {
    return this.#port.cardsOf(role).some(({ port }) => this.#modelsOf(port).control([name]) !== undefined);
  }
  // the instruments that read one of the note's own values, by their names, each once
  readersOf(name: string): string[] {
    const roles = Object.keys(this.#port.instruments).filter((role) => this.reads(role, name));
    return [...new Set(roles.flatMap((role) => this.#port.instruments[role] ?? []))];
  }
  // a card's models, made as it's first asked for
  #modelsOf(port: ModelPort): ViewBuilder {
    let models = this.#models.get(port);
    if (!models) {
      models = new ViewBuilder(port);
      this.#models.set(port, models);
    }
    return models;
  }
}

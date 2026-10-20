// ---------- view/instrument/models/instrument-racks: the instruments as the device view shows them ----------
// Each role's instrument a rack of its cards, a pad each, read through their readout (InstrumentsReadout).
// The test note every instrument plays, set once for all:
//   - its pitch and velocity, MIDI 1.0's at the edge, as its row sets them;
//   - the note's own values, from their defaults, the starts handed in over them;
//   - held for as long as its button is, from a little after now, pressed and let go as the
//     app's messages.
// Which of the note's own values a role's instrument reads, for its row to grey the others.
import { OWN_NOTE_VALUES, type PresetMessage, type TestNoteMessage } from '../../../plan/synth/index.ts';
import type { InstrumentCard, InstrumentsReadout } from '../readout/index.ts';
import type { PlanReadout } from '../../device/readout/index.ts';
import { ViewBuilder } from '../../device/models/index.ts';

// what the racks send on a bus: a role's reset, its test note pressed and let go
type RackMessage = PresetMessage | TestNoteMessage;
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
  readonly #instrumentsReadout: InstrumentsReadout;
  readonly #clock: { now(): number };
  readonly #send: (message: RackMessage) => void;
  readonly #models = new WeakMap<PlanReadout, ViewBuilder>(); // each card's, made as first asked for
  #pressed: string | null = null; // the role whose test note is held, for as long as its button is

  // send(): a reset and the test note sent on a bus
  // starts: the test note's own values as it starts, by their names, over their defaults
  constructor({
    instrumentsReadout,
    clock,
    send,
    starts,
  }: {
    instrumentsReadout: InstrumentsReadout;
    clock: { now(): number };
    send: (message: RackMessage) => void;
    starts: Readonly<Record<string, number>>;
  }) {
    this.#instrumentsReadout = instrumentsReadout;
    this.#clock = clock;
    this.#send = send;
    this.values = Object.fromEntries(
      OWN_NOTE_VALUES.map(({ name, default: start }) => [name, starts[name] ?? Number(start ?? 0)]),
    );
  }
  // A role's instrument as a rack of its cards; none for a role with no instrument.
  rackOf(role: string): InstrumentRack | null {
    const cards = this.#instrumentsReadout.cardsOf(role);
    if (!cards.length) {
      return null;
    }
    const pads = cards.map((card) => ({
      name: `${card.key}: ${card.patch}`,
      patch: card.patch,
      models: this.#modelsOf(card),
    }));
    return { key: role, status: `${role}: ${this.#instrumentsReadout.instruments[role]}`, pads };
  }
  // A role's instrument back as it was: every card of its patches put back.
  reset(role: string): void {
    for (const { patch } of this.#instrumentsReadout.cardsOf(role)) {
      this.#send({ type: 'preset reset', patch });
    }
  }
  // The test note pressed on a role's instrument, its values as they are now.
  press(role: string): void {
    this.#pressed = role;
    const note = {
      pitch: this.note.pitch,
      velocity: this.note.velocity / 127,
      t: this.#clock.now() + AHEAD,
      values: { ...this.values },
    };
    this.#send({ type: 'test note', key: role, note });
  }
  lift(): void {
    if (this.#pressed === null) {
      return;
    }
    this.#send({ type: 'test note released', key: this.#pressed, t: this.#clock.now() + AHEAD });
    this.#pressed = null;
  }
  // whether a role's instrument reads one of the note's own values: a card of its has it
  reads(role: string, name: string): boolean {
    return this.#instrumentsReadout.cardsOf(role).some((card) => this.#modelsOf(card).control([name]) !== undefined);
  }
  // the instruments that read one of the note's own values, by their names, each once
  readersOf(name: string): string[] {
    const roles = Object.keys(this.#instrumentsReadout.instruments).filter((role) => this.reads(role, name));
    return [...new Set(roles.flatMap((role) => this.#instrumentsReadout.instruments[role] ?? []))];
  }
  // a card's models, made as it's first asked for
  #modelsOf({ planReadout, send }: InstrumentCard): ViewBuilder {
    let models = this.#models.get(planReadout);
    if (!models) {
      models = new ViewBuilder(planReadout, send);
      this.#models.set(planReadout, models);
    }
    return models;
  }
}

// ---------- view/models/cards: an instrument's patches as the device view edits them ----------
// A card for each patch an instrument plays, its own, or a drum rack's pads, each by its key:
// its preset on its voice card, read and set through a port (preset-port.ts). The patch is
// edited in the bank, not an instrument playing it: an edit reaches every instrument that plays
// it, and those still to come.
//   - its voice card planned at its preset as the bank has it now, values from outside over its
//     own where it has them (a panel's knobs), as it plays; planned again once either changes;
//   - each value its preset's, those from outside over its own;
//   - how each is set: a note's source by the note, a value from outside by what it says, the
//     rest live;
//   - a value or a setting changed: the bank's preset changed.
import {
  addressOf,
  addressText,
  paramAt,
  type Address,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Preset } from '../../plan/planner/index.ts';
import { cardPlanner, NOTE_SOURCES, type Instruments } from '../../plan/synth/index.ts';
import { entryOf, type LiveCopies } from '../../util/index.ts';
import type { Command } from './command.ts';
import type { ModelPort, Role } from './model.ts';
import { PresetPort } from './preset-port.ts';

// a card of an instrument: the patch it edits, by its name; a drum rack's pad's key; its port
export interface InstrumentCard {
  readonly patch: string;
  readonly key?: number;
  readonly port: ModelPort;
}
// Values from outside over a voice card's own, by their addresses in it, and what sets them,
// as a card's hints say it (the tweak panel).
export interface CardValues {
  readonly values: () => Readonly<Record<string, number>>;
  readonly source: string;
}

const BY_THE_NOTE: Role = { by: 'automated', source: 'the note' };
const NONE: CardValues = { values: () => ({}), source: '' };

// The cards of a file of instruments' patches: one port for each patch, made as it's first asked for.
export class InstrumentCards {
  readonly #instruments: Instruments;
  readonly #bank: LiveCopies<Preset>;
  readonly #ports = new Map<string, ModelPort>();
  // each patch's voice card planned at its preset alone, which says what values it has
  readonly #bare = new Map<string, Plan>();
  // each patch's voice card, planned at its preset and the values from outside, as they were
  readonly #plans = new Map<string, { over: string; plan: Plan }>();

  // instruments: the file the patches are in; bank: its patches as they play, edited in place by name
  constructor({ instruments, bank }: { instruments: Instruments; bank: LiveCopies<Preset> }) {
    this.#instruments = instruments;
    this.#bank = bank;
    bank.onSet((name) => {
      this.#bare.delete(name);
      this.#plans.delete(name);
    }); // planned again as it's next asked for
  }
  // An instrument's cards, by the patch it plays: the patch's, or its rack's pads', each by its
  // key; values from outside over each card's own, as first asked for.
  of(patch: string, over: CardValues = NONE): InstrumentCard[] {
    const pads = this.#instruments.racks[patch];
    if (pads) {
      return pads.map(({ key, patch: pad }) => ({ patch: pad, key, port: this.#portOf(pad, over) }));
    }
    return [{ patch, port: this.#portOf(patch, over) }];
  }

  // a patch's port, made as it's first asked for
  #portOf(name: string, over: CardValues): ModelPort {
    return entryOf(this.#ports, name, () => {
      const preset = (): Preset => this.#bank.of(name)!; // a patch an instrument plays: the bank has it
      return new PresetPort({
        plan: () => this.#planOf(name, preset(), over.values()),
        values: () => ({ ...valuesOf(preset()), ...over.values() }),
        start: () => valuesOf(this.#bank.start(name)!), // the bank has it
        roleOf: (address) => roleOf(address, over),
        changed: (command) => this.#bank.set(name, changedBy(preset(), command)),
      });
    });
  }
  // A patch's voice card planned at its preset and those of the values from outside it has,
  // again as either changes.
  #planOf(name: string, preset: Preset, over: Readonly<Record<string, number>>): Plan {
    const bare = entryOf(this.#bare, name, () => this.#planAt(preset, {}));
    const own = Object.entries(over).filter(([address]) => paramAt(bare, addressOf(address)) !== undefined);
    const key = JSON.stringify(own);
    const planned = this.#plans.get(name);
    if (planned?.over === key) {
      return planned.plan;
    }
    const plan = this.#planAt(preset, Object.fromEntries(own));
    this.#plans.set(name, { over: key, plan });
    return plan;
  }
  // a preset's voice card planned, the values given over its own
  #planAt({ kind, values = {}, settings = {} }: Preset, over: ValuesByAddress): Plan {
    return cardPlanner(this.#instruments.templates).plan(kind, { values: { ...values, ...over }, settings });
  }
}

// a preset's values and settings, by their addresses in its voice card
function valuesOf({ values = {}, settings = {} }: Preset): ValuesByAddress {
  return { ...values, ...settings };
}
// How a card's value is set: a note's source by the note; one from outside by what sets it;
// else as the port says of the rest.
function roleOf(address: Address, over: CardValues): Role | undefined {
  const [name, ...within] = address;
  if (!within.length && name !== undefined && Object.hasOwn(NOTE_SOURCES, name)) {
    return BY_THE_NOTE;
  }
  if (Object.hasOwn(over.values(), addressText(address))) {
    return { by: 'automated', source: over.source };
  }
  return undefined;
}
// a preset changed by what's done: a param's value, or a setting
function changedBy(preset: Preset, { type, address, value }: Command): Preset {
  const text = addressText(address);
  if (type === 'setting') {
    return { ...preset, settings: { ...preset.settings, [text]: value } };
  }
  return { ...preset, values: { ...preset.values, [text]: value } };
}

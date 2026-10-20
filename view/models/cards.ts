// ---------- view/models/cards: an instrument's patches as the device view edits them ----------
// A card for each patch an instrument plays, its own, or a drum rack's pads, each by its key:
// its preset on its voice card, read through a preset's readout (libs/view/control-surface/preset.ts). The patch is
// edited in the bank, not an instrument playing it: an edit reaches every instrument that plays
// it, and those still to come.
//   - its voice card planned at its preset as the bank has it now, values from outside over its
//     own where it has them (a panel's knobs), as it plays; planned again once either changes;
//   - each value its preset's, those from outside over its own;
//   - how each is set: a note's source by the note, a value from outside by what it says, the
//     rest live;
//   - a value or a setting changed: sent as the app's message (PresetMessage), its owner
//     changing the bank's preset as it hears it.
import {
  addressOf,
  addressText,
  paramAt,
  type Address,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Preset } from '../../plan/planner/index.ts';
import { cardPlanner, NOTE_SOURCES, type Instruments, type PresetMessage } from '../../plan/synth/index.ts';
import { entryOf, type LiveCopies } from '../../util/index.ts';
import {
  PresetReadout,
  type Command,
  type InstrumentCard,
  type PlanReadout,
  type Role,
} from '../control-surface/index.ts';

// Values from outside over a voice card's own, by their addresses in it, and what sets them,
// as a card's hints say it (the tweak panel).
export interface CardValues {
  readonly values: () => Readonly<Record<string, number>>;
  readonly source: string;
}

const BY_THE_NOTE: Role = { by: 'automated', source: 'the note' };
const NONE: CardValues = { values: () => ({}), source: '' };

// The cards of a file of instruments' patches: a preset's readout for each patch, made as it's first asked for.
export class InstrumentCards {
  readonly #instruments: Instruments;
  readonly #bank: LiveCopies<Preset>;
  readonly #send: (message: PresetMessage) => void;
  readonly #planReadouts = new Map<string, PlanReadout>();
  // each patch's voice card planned at its preset alone, which says what values it has
  readonly #bare = new Map<string, Plan>();
  // each patch's voice card, planned at its preset and the values from outside, as they were
  readonly #plans = new Map<string, { over: string; plan: Plan }>();

  // instruments: the file the patches are in; bank: its patches as they play, read by name;
  // send(): an edit sent on the app's bus, the bank changed by whoever hears it
  constructor({
    instruments,
    bank,
    send,
  }: {
    instruments: Instruments;
    bank: LiveCopies<Preset>;
    send: (message: PresetMessage) => void;
  }) {
    this.#instruments = instruments;
    this.#bank = bank;
    this.#send = send;
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
      return pads.map(({ key, patch: pad }) => this.#cardOf(pad, over, key));
    }
    return [this.#cardOf(patch, over)];
  }
  // a patch's card: its preset's readout, and its edits sent as the bank's messages
  #cardOf(patch: string, over: CardValues, key?: number): InstrumentCard {
    const planReadout = this.#planReadoutOf(patch, over);
    const send = (command: Command): void => this.#send(editOf(patch, command));
    return key === undefined ? { patch, planReadout, send } : { patch, key, planReadout, send };
  }

  // a patch's preset's readout, made as it's first asked for
  #planReadoutOf(name: string, over: CardValues): PlanReadout {
    return entryOf(this.#planReadouts, name, () => {
      const preset = (): Preset => this.#bank.of(name)!; // a patch an instrument plays: the bank has it
      return new PresetReadout({
        plan: () => this.#planOf(name, preset(), over.values()),
        values: () => ({ ...valuesOf(preset()), ...over.values() }),
        start: () => valuesOf(this.#bank.start(name)!), // the bank has it
        roleOf: (address) => roleOf(address, over),
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
    return cardPlanner(this.#instruments).plan(kind, { values: { ...values, ...over }, settings });
  }
}

// a preset's values and settings, by their addresses in its voice card
function valuesOf({ values = {}, settings = {} }: Preset): ValuesByAddress {
  return { ...values, ...settings };
}
// How a card's value is set: a note's source by the note; one from outside by what sets it;
// else as the preset's readout says of the rest.
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
// What's done on a patch's card as the bank's message: a param's value, or a setting.
function editOf(patch: string, { type, address, value }: Command): Extract<PresetMessage, { type: 'preset edited' }> {
  if (type === 'setting') {
    return { type: 'preset edited', patch, of: 'settings', address, value };
  }
  return { type: 'preset edited', patch, of: 'values', address, value };
}

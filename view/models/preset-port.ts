// ---------- view/models/preset-port: a preset on a plan, as the views read and set it ----------
// A port for a plan whose values a preset gives, as a patch gives its voice card's:
//   - each value the preset's, by its address; the plan's where the preset has none;
//   - each value's start the preset's as it began, which a reset brings back;
//   - how each is set: as its owner says, else by what moves it where a macro does, else live.
// What's done is sent as the preset's message by whoever makes its models.
// It hears no sound, holds no copies and fills no slots.
import { addressText, PlanMoves, type Address, type Plan, type ValuesByAddress } from '../../plan/format/index.ts';
import type { ModelPort, Role, Slot } from './model.ts';

// What owns the preset:
//   - plan: the plan at the preset as it is now, a macro's targets at its value;
//   - values, start: the preset's values and settings by address, now and as it began;
//   - roleOf: how a value is set, where the owner says (set by the note, by a panel).
export interface PresetOwner {
  plan(): Plan;
  values(): ValuesByAddress;
  start(): ValuesByAddress;
  roleOf?(address: Address): Role | undefined;
}

const LIVE: Role = { by: 'live' };

// A preset on a plan, read and set through its owner.
export class PresetPort implements ModelPort {
  readonly #owner: PresetOwner;
  readonly #moves = new PlanMoves();

  constructor(owner: PresetOwner) {
    this.#owner = owner;
  }
  get plan(): Plan {
    return this.#owner.plan();
  }
  valueOf(address: Address): number | string | undefined {
    return this.#owner.values()[addressText(address)];
  }
  startOf(address: Address): number | string | undefined {
    return this.#owner.start()[addressText(address)];
  }
  // as its owner says; else by the macro that moves it, its name; else live
  roleOf(address: Address): Role {
    const said = this.#owner.roleOf?.(address);
    if (said) {
      return said;
    }
    const macro = this.#moves.of(this.plan, address).find(({ kind }) => kind === 'macro');
    return macro ? { by: 'automated', source: addressText(macro.by) } : LIVE;
  }
  peakOf(): number {
    return 0;
  }
  readingOf(): number {
    return 0;
  }
  copiesOf(): readonly Address[] {
    return [];
  }
  slotOf(): Slot | undefined {
    return undefined;
  }
}

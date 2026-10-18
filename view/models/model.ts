// ---------- view/models/model: the plan and its values by address, as the views read them ----------
// Read through the plan's readout (PlanReadout, libs/view/control-surface/):
//   - each value as it plays, worked out from what it was told; the plan's where none was;
//   - each value's start, which a reset brings back;
//   - how each is set: live here, automated by what its track plays, or fixed as built;
//   - a node's level as the implementation hears it, the only one that hears the sound, at
//     one of its points where it has several; a reading, a limiter's reduction;
//   - a pool's copies added so far;
//   - what a node does in its slot and what sets it there, the tool's words.
// What's done sent as a command, through the send handed in: the app's message for the plan.
// And what moves each param, worked out from the plan alone (PlanMoves).
import {
  paramAt,
  PlanMoves,
  settingAt,
  type Address,
  type Move,
  type Param,
  type Plan,
} from '../../plan/format/index.ts';
import type { Command, PlanReadout, Role, Slot } from '../control-surface/index.ts';

// a param or a setting found by its address, and which of the two
export interface Found {
  readonly kind: Command['type'];
  readonly param: Param;
}

// The plan and its values by address, read through the plan's readout.
export class Model {
  readonly #in: PlanReadout;
  readonly #send: (command: Command) => void;
  readonly #moves = new PlanMoves();

  // send(): what's done, as the app's message for the plan
  constructor(planReadout: PlanReadout, send: (command: Command) => void) {
    this.#in = planReadout;
    this.#send = send;
  }
  get plan(): Plan {
    return this.#in.plan;
  }
  // a param or a setting by its address; none where nothing's there
  find(address: Address): Found | undefined {
    const param = paramAt(this.plan, address);
    if (param) {
      return { kind: 'param', param };
    }
    const setting = settingAt(this.plan, address);
    return setting && { kind: 'setting', param: setting };
  }
  // a value as it plays; the plan's where none was told
  valueOf(address: Address, { param }: Found): number | string {
    return this.#in.valueOf(address) ?? param.value;
  }
  // a value as it starts, which a reset brings back; the plan's where the tool has none
  startOf(address: Address, { param }: Found): number | string {
    return this.#in.startOf(address) ?? param.value;
  }
  roleOf(address: Address): Role {
    return this.#in.roleOf(address);
  }
  peakOf(address: Address, point?: string): number {
    return this.#in.peakOf(address, point);
  }
  readingOf(address: Address, reading: string): number {
    return this.#in.readingOf(address, reading);
  }
  copiesOf(pool: Address): readonly Address[] {
    return this.#in.copiesOf(pool);
  }
  slotOf(address: Address): Slot | undefined {
    return this.#in.slotOf(address);
  }
  send(command: Command): void {
    this.#send(command);
  }
  // what moves a param, by its address: a macro's maps, a child wired into it; worked out again
  // for a plan handed anew
  movesOf(address: Address): readonly Move[] {
    return this.#moves.of(this.plan, address);
  }
  // what a composite's own sources move, by its address
  movesAt(address: Address): readonly Move[] {
    return this.#moves.madeAt(this.plan, address);
  }
}

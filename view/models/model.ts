// ---------- view/models/model: the plan and its values by address, as the views read them ----------
// Read through a port, the tool's:
//   - each value as it plays, worked out from what it was told; the plan's where none was;
//   - each value's start, which a reset brings back;
//   - how each is set: live here, automated by what its track plays, or fixed as built;
//   - what's done, sent as a command.
import { paramAt, settingAt, type Address, type Param, type Plan } from '../../plan/format/index.ts';
import type { Command } from './command.ts';

// How a value is set, as the tool says:
//   - live: set here, in a view;
//   - automated: by what its track plays, its source where it names one (distance);
//   - fixed: as it was built.
export interface Role {
  readonly by: 'live' | 'automated' | 'fixed';
  readonly source?: string;
}
// What the views read and send through, the tool's.
export interface ModelPort {
  readonly plan: Plan;
  valueOf(address: Address): number | string | undefined;
  startOf(address: Address): number | string | undefined;
  roleOf(address: Address): Role;
  send(command: Command): void;
}
// a param or a setting found by its address, and which of the two
export interface Found {
  readonly kind: Command['type'];
  readonly param: Param;
}

// The plan and its values by address, read through the tool's port.
export class Model {
  readonly #port: ModelPort;

  constructor(port: ModelPort) {
    this.#port = port;
  }
  get plan(): Plan {
    return this.#port.plan;
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
    return this.#port.valueOf(address) ?? param.value;
  }
  // a value as it starts, which a reset brings back; the plan's where the tool has none
  startOf(address: Address, { param }: Found): number | string {
    return this.#port.startOf(address) ?? param.value;
  }
  roleOf(address: Address): Role {
    return this.#port.roleOf(address);
  }
  send(command: Command): void {
    this.#port.send(command);
  }
}

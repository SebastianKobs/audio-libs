// ---------- view/models/device: a node as a device, its controls in order ----------
// As Ableton shows a device: its name and kind, then its controls, each by its address.
// What every control on it has: its address, a param's or a setting's, its declared spec,
// its words, and how it's set.
import type { ParamSpec } from '../../params/index.ts';
import type { Address } from '../../plan/format/index.ts';
import type { Found, Model, Role } from './model.ts';

// A node as a device:
//   - a composite: its macros, in its template's order, then the settings within it;
//   - a block: its params, then its settings.
export interface Device {
  readonly name: string;
  readonly kind: string;
  readonly controls: readonly Control[];
}

// A control on a device, a knob or a choice: a param or a setting by its address.
export abstract class Control {
  readonly address: Address;
  readonly kind: Found['kind'];
  readonly spec: ParamSpec;
  readonly hint: string | undefined;
  protected readonly model: Model;
  protected readonly found: Found;

  constructor(model: Model, address: Address, found: Found) {
    this.model = model;
    this.found = found;
    this.address = address;
    this.kind = found.kind;
    this.spec = found.param.spec;
    this.hint = found.param.hint;
  }
  get name(): string {
    return this.spec.name;
  }
  get role(): Role {
    return this.model.roleOf(this.address);
  }
  get live(): boolean {
    return this.role.by === 'live';
  }
}

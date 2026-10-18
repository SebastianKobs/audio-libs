// ---------- view/models/device: a node as a device, its controls in order ----------
// As Ableton shows a device: its name and kind, then its controls, each by its address.
// What every control on it has: its address, a param's or a setting's, its declared spec,
// its words, and how it's set.
import type { ParamSpec } from '../../params/index.ts';
import type { Address, Move } from '../../plan/format/index.ts';
import type { Found, Model } from './model.ts';
import type { Role, Slot } from '../control-surface/index.ts';

// A node as a device:
//   - its address, its name, its kind, its label as shown, its node's, else its kind;
//   - what it does in its slot and what sets it there, where the tool says;
//   - its controls: a composite's macros, in its template's order, then the settings within
//     it; a block's params, then its settings.
export interface Device {
  readonly address: Address;
  readonly name: string;
  readonly kind: string;
  readonly label: string;
  readonly slot: Slot | undefined;
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
  // what moves it: a macro's maps, a child wired into it
  get moves(): readonly Move[] {
    return this.model.movesOf(this.address);
  }
}

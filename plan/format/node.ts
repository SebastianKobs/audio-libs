// ---------- plan/format/node: a node, a block or a composite ----------
// One kind of thing: its inputs, outputs, params and settings, and an optional inside.
//   - A block: no inside; its kind the block's (oscillator).
//   - A composite: an inside; its kind its template's (Utility), its own params its macros.
// The form it fulfils beside its kind (channel), and its role in its parent where the
// parent's form gives one (insert, fader).
import type { Inside } from './inside.ts';
import type { Input, Output } from './input-output.ts';
import type { Param, Setting } from './param.ts';

// a node: its name, one of a kind in its parent
export interface Node {
  readonly name: string;
  readonly kind: string;
  readonly form?: string;
  readonly role?: string;
  readonly inputs: readonly Input[];
  readonly outputs: readonly Output[];
  readonly params: readonly Param[];
  readonly settings: readonly Setting[];
  readonly inside?: Inside;
}

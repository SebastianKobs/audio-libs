// ---------- plan/format/inside: a node's inside, its children and their wiring ----------
// A composite's: its children by name, in the plan's order; the wires between them and
// its own inputs and outputs; its macros, its own params; its pools.
import type { Macro } from './macro.ts';
import type { Node } from './node.ts';
import type { Pool } from './pool.ts';
import type { Wire } from './wire.ts';

// an inside: each child's name one of a kind among them
export interface Inside {
  readonly children: readonly Node[];
  readonly wires: readonly Wire[];
  readonly macros: readonly Macro[];
  readonly pools: readonly Pool[];
}

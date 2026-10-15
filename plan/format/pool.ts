// ---------- plan/format/pool: children that come and go, in a plan ----------
// Its child ready, named as the pool is; each copy named the pool's name and its number,
// from 1 (replay tower 3). Its wires the rule each copy is wired by, written with the
// pool's name. A pool of voices holds the addresses its notes set.
import type { Address } from './address.ts';
import type { Node } from './node.ts';
import type { Wire } from './wire.ts';

// the params a note sets in a voice, by their addresses within it, as CV sets a voice card's
export interface NoteAddresses {
  readonly pitch: readonly Address[];
  readonly velocity: readonly Address[];
  readonly gate: readonly Address[];
}
// a pool: its child ready, the wires a copy is wired by; a voice's, the addresses its notes set
export interface Pool {
  readonly child: Node;
  readonly wires: readonly Wire[];
  readonly note?: NoteAddresses;
}

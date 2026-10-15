// ---------- plan/format/pool: children that come and go, in a plan ----------
// Its child ready, named as the pool is; each copy named the pool's name and its number,
// from 1 (replay tower 3). Its wires the rule each copy is wired by, written with the
// pool's name. A pool of voices holds the addresses its notes set.
import type { Address } from './address.ts';
import type { Inside } from './inside.ts';
import type { Node } from './node.ts';
import type { Wire, WireFrom, WireTo } from './wire.ts';

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

// a copy's number after its pool's name: a whole number from 1, no leading 0
const COPY_NUMBER = /^[1-9]\d*$/;

// A pool's copy: its child under the copy's name, the pool's name and its number from 1;
// its wires with the copy's name for the pool's.
export function copyOf(pool: Pool, number: number): { node: Node; wires: Wire[] } {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`a pool's copies are numbered from 1: ${number}`);
  }
  const name = `${pool.child.name} ${number}`;
  const wires = pool.wires.map(({ from, to }) => ({
    from: renamed(from, pool.child.name, name),
    to: renamed(to, pool.child.name, name),
  }));
  return { node: { ...pool.child, name }, wires };
}
// The pool a copy is of, by the copy's name: its pool's name and a number from 1.
export function poolOfCopy(inside: Inside, name: string): Pool | undefined {
  return inside.pools.find((pool) => {
    const prefix = `${pool.child.name} `;
    return name.startsWith(prefix) && COPY_NUMBER.test(name.slice(prefix.length));
  });
}

// a wire's end with the pool's name for its node renamed the copy's; any other end as it is
function renamed<End extends WireFrom | WireTo>(end: End, pool: string, copy: string): End {
  if (!('node' in end) || end.node !== pool) {
    return end;
  }
  return { ...end, node: copy };
}

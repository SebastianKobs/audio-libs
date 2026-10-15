// ---------- plan/format/param-at: a node, a param or a setting found by its address ----------
// Walked down from the plan's top by the address's names: each a child by its name,
// or a pool's copy by its name and number. Its last name a param or a macro, or a setting.
// None where nothing's there.
import type { Address } from './address.ts';
import type { Node } from './node.ts';
import type { Param, Setting } from './param.ts';
import type { Plan } from './plan.ts';
import { poolOfCopy } from './pool.ts';

// The node an address's names lead to; the plan's top for none.
export function nodeAt(plan: Plan, names: Address): Node | undefined {
  let node = plan.node;
  for (const name of names) {
    const child = childNamed(node, name);
    if (!child) {
      return undefined;
    }
    node = child;
  }
  return node;
}
// A param by its address: a node's own, or a composite's macro.
export function paramAt(plan: Plan, address: Address): Param | undefined {
  const node = nodeAt(plan, address.slice(0, -1));
  const name = address.at(-1);
  if (!node || name === undefined) {
    return undefined;
  }
  return named(node.params, name) ?? named(node.inside?.macros ?? [], name);
}
// A setting by its address.
export function settingAt(plan: Plan, address: Address): Setting | undefined {
  const node = nodeAt(plan, address.slice(0, -1));
  const name = address.at(-1);
  if (!node || name === undefined) {
    return undefined;
  }
  return named(node.settings, name);
}

// a node's child by its name, or its pool's copy by its name and number, the pool's child standing for it
function childNamed(node: Node, name: string): Node | undefined {
  const inside = node.inside;
  if (!inside) {
    return undefined;
  }
  return inside.children.find((child) => child.name === name) ?? poolOfCopy(inside, name)?.child;
}
// a param or a setting by its spec's name
function named<Item extends Param>(items: readonly Item[], name: string): Item | undefined {
  return items.find((item) => item.spec.name === name);
}

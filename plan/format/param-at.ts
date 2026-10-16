// ---------- plan/format/param-at: a node, a param or a setting found by its address; settings changed by it ----------
// Walked down from the plan's top by the address's names: each a child by its name,
// or a pool's copy by its name and number. Its last name a param or a macro, or a setting.
// None where nothing's there.
// Settings changed by address: a new plan, the old as it was. A pool's child's by a copy's
// address: every copy of it, as they're built from it. A setting not there refused.
import { addressOf, type Address, type ValuesByAddress } from './address.ts';
import { isComposite, type Node } from './node.ts';
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
  return named(node.params, name) ?? named(node.macros ?? [], name);
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
  if (!isComposite(node)) {
    return undefined;
  }
  return node.children.find((child) => child.name === name) ?? poolOfCopy(node, name)?.child;
}
// a param or a setting by its spec's name
function named<Item extends Param>(items: readonly Item[], name: string): Item | undefined {
  return items.find((item) => item.spec.name === name);
}
// A plan with settings changed, each at its address.
export function withSettings(plan: Plan, settings: ValuesByAddress): Plan {
  let node = plan.node;
  for (const [text, value] of Object.entries(settings)) {
    node = settingChanged(node, addressOf(text), value, text);
  }
  return { ...plan, node };
}

// a node with one setting changed, down its address: its own where the address names it, else a child's
function settingChanged(node: Node, [name, ...rest]: Address, value: number | string, whole: string): Node {
  if (name === undefined) {
    throw new Error(`${whole}: no setting`);
  }
  if (!rest.length) {
    if (!node.settings.some((setting) => setting.spec.name === name)) {
      throw new Error(`${whole}: no setting`);
    }
    const settings = node.settings.map((setting) => (setting.spec.name === name ? { ...setting, value } : setting));
    return { ...node, settings };
  }
  if (!isComposite(node)) {
    throw new Error(`${whole}: no setting`);
  }
  const child = node.children.find((each) => each.name === name);
  if (child) {
    const children = node.children.map((each) => (each === child ? settingChanged(each, rest, value, whole) : each));
    return { ...node, children };
  }
  const pool = poolOfCopy(node, name);
  if (!pool) {
    throw new Error(`${whole}: no setting`);
  }
  const pools = node.pools.map((each) =>
    each === pool ? { ...each, child: settingChanged(each.child, rest, value, whole) } : each,
  );
  return { ...node, pools };
}

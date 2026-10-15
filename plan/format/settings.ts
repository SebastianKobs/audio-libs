// ---------- plan/format/settings: a plan's settings changed by address ----------
// A new plan, the old as it was: each setting at its address given its new value. A pool's
// child's by a copy's address: every copy of it, as they're built from it. A setting not there refused.
import { addressOf, type Address, type ValuesByAddress } from './address.ts';
import type { Node } from './node.ts';
import type { Plan } from './plan.ts';
import { poolOfCopy } from './pool.ts';

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
  const inside = node.inside;
  const child = inside?.children.find((each) => each.name === name);
  if (inside && child) {
    const children = inside.children.map((each) => (each === child ? settingChanged(each, rest, value, whole) : each));
    return { ...node, inside: { ...inside, children } };
  }
  const pool = inside && poolOfCopy(inside, name);
  if (!inside || !pool) {
    throw new Error(`${whole}: no setting`);
  }
  const pools = inside.pools.map((each) =>
    each === pool ? { ...each, child: settingChanged(each.child, rest, value, whole) } : each,
  );
  return { ...node, inside: { ...inside, pools } };
}

// ---------- build/web-audio/blocks/select: one of two inputs passed on, in Web Audio ----------
// A gain at 1 the named input goes into, its way out; the other input a gain of its own that goes nowhere.
// Its setting changed, it's built again, as any setting.
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { settingOf, type Making } from '../making.ts';

export function select(node: Node, making: Making): BuiltNode {
  const passed = making.kept(making.context.createGain());
  const held = making.kept(making.context.createGain()); // the input not passed on: into nothing
  const inputs = settingOf(node, 'input') === 'b' ? { a: held, b: passed } : { a: passed, b: held };
  return new BuiltNode({ input: passed, output: passed, params: {}, inputs, kind: 'a select' });
}

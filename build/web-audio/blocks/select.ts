// ---------- build/web-audio/blocks/select: one of two inputs passed on ----------
// The named input goes into a gain at 1, its way out.
// The other input goes into a gain of its own that goes nowhere.
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

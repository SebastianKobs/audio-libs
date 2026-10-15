// ---------- build/web-audio/making: what a block's maker is handed ----------
// The context and its buffers, the beat, whether it can pan; and two hands for what it makes:
//   - kept(): a node made, taken apart with the rest;
//   - started(): a source, started as it's built, stopped with the rest.
// And a block's values and settings read from its node, its values set on what's built.
import type { Node } from '../../plan/format/index.ts';
import type { Buffers } from './buffers.ts';
import type { BuiltNode } from './built-node.ts';

// what a maker is handed
export interface Making {
  readonly context: BaseAudioContext;
  readonly buffers: Buffers;
  readonly beat: () => number;
  readonly canPan: boolean;
  kept<Made extends AudioNode>(node: Made): Made;
  started<Source extends AudioScheduledSourceNode>(source: Source): Source;
}
// a block's maker: its node as planned, made in Web Audio
export type Maker = (node: Node, making: Making) => BuiltNode;

// a block's param's value as it starts, by its name
export function valueOf(node: Node, name: string): number | string | undefined {
  return node.params.find((param) => param.spec.name === name)?.value;
}
// a block's setting, by its name
export function settingOf(node: Node, name: string): number | string | undefined {
  return node.settings.find((setting) => setting.spec.name === name)?.value;
}
// each of a block's params set on what's built, at its value as it starts; one it hasn't, left
export function atValues(built: BuiltNode, node: Node): BuiltNode {
  for (const { spec, value } of node.params) {
    const param = built.param(spec.name);
    if (param && typeof value === 'number') {
      param.value = value;
    }
  }
  return built;
}

// ---------- build/web-audio/wiring: a node's jacks as built, and a composite's wires made ----------
// A block's jacks are its built node's way in and out, its params its Web Audio params.
// A composite has no node of its own: its jacks are its children's, as its wires lead them:
//   - an input: the children's inputs and params it's wired into;
//   - an output: the children's outputs wired into it.
// So a sound wired into a composite goes straight to what's inside, no node between.
import type { Node, WireTo } from '../../plan/format/index.ts';
import type { BuiltNode } from './built-node.ts';

// where a sound can go: a node's input, or a param
export type Destination = AudioNode | AudioParam;
// a node's jacks as built: where each input goes in, what each output comes out of, each param's Web Audio params
export interface Jacks {
  readonly inputs: Readonly<Record<string, readonly Destination[]>>;
  readonly outputs: Readonly<Record<string, readonly AudioNode[]>>;
  paramsOf(name: string): readonly AudioParam[];
}

// a block's jacks: each input its built node's way in, each output its way out
export function blockJacks(node: Node, built: BuiltNode): Jacks {
  return {
    inputs: Object.fromEntries(node.inputs.map(({ name }) => [name, [built.input]])),
    outputs: Object.fromEntries(node.outputs.map(({ name }) => [name, [built.output]])),
    paramsOf: (name) => built.cablesOf(name),
  };
}
// A composite's jacks, its wires made by names:
//   - between two children: each output's node into each input or param;
//   - from its own input: those its input leads to; into its own output: those that lead to it.
export function compositeJacks(node: Node, children: ReadonlyMap<string, Jacks>): Jacks {
  const inputs: Record<string, Destination[]> = {};
  const outputs: Record<string, AudioNode[]> = {};
  const childNamed = (name: string): Jacks => children.get(name)!; // a well-formed plan's child
  for (const { from, to } of node.inside?.wires ?? []) {
    const destinations = destinationsOf(to, childNamed);
    if (!('node' in from)) {
      (inputs[from.input] ??= []).push(...(destinations ?? refused(node, from.input)));
      continue;
    }
    const sources = childNamed(from.node).outputs[from.output] ?? [];
    if (destinations) {
      sources.forEach((source) => destinations.forEach((destination) => connectInto(source, destination)));
    } else {
      (outputs[(to as { output: string }).output] ??= []).push(...sources); // none of its child's: its own output
    }
  }
  return {
    inputs,
    outputs,
    paramsOf: (name) => {
      throw new Error(`${node.name}/${name}: a sound into a macro, not built`);
    },
  };
}
// a sound into a node's input or into a param, as Web Audio wires each
export function connectInto(source: AudioNode, destination: Destination): void {
  if ('connect' in destination) {
    source.connect(destination);
  } else {
    source.connect(destination);
  }
}

// where a wire goes inside: a child's input or param; none for the parent's own output
function destinationsOf(to: WireTo, childNamed: (name: string) => Jacks): readonly Destination[] | undefined {
  if (!('node' in to)) {
    return undefined;
  }
  if ('param' in to) {
    return childNamed(to.node).paramsOf(to.param);
  }
  return childNamed(to.node).inputs[to.input] ?? [];
}
// a wire from a composite's input straight to its output: no node to carry it
function refused(node: Node, input: string): never {
  throw new Error(`${node.name}: its input ${input} wired straight to an output, with nothing between`);
}

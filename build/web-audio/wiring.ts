// ---------- build/web-audio/wiring: a node's jacks as built, and a composite's wires made ----------
// A block's jacks are its built node's way in and out, its params its Web Audio params.
// A composite's jacks are its children's, as its wires lead them:
//   - with no pool: no node of its own, a sound wired into it going straight inside, out of it straight
//     from inside: an input the children's inputs and params it leads to, an output those that lead to it;
//   - with a pool: a node at each of its own jacks, where copies come and go, wired later by its pool's rule.
import type { Node, Wire, WireFrom, WireTo } from '../../plan/format/index.ts';
import type { BuiltNode } from './built-node.ts';

// where a sound can go: a node's input, or a param
export type Destination = AudioNode | AudioParam;
// a node's jacks as built: where each input goes in, what each output comes out of, each param's Web Audio params
export interface Jacks {
  readonly inputs: Readonly<Record<string, readonly Destination[]>>;
  readonly outputs: Readonly<Record<string, readonly AudioNode[]>>;
  paramsOf(name: string): readonly AudioParam[];
}
// a composite's own jacks as nodes, where it holds a pool: a node at each input and each output, by name
export interface OwnJacks {
  readonly inputs: Readonly<Record<string, AudioNode>>;
  readonly outputs: Readonly<Record<string, AudioNode>>;
}
// what a composite's wires led through it, where it has no node of its own: by its own jacks' names
interface Collected {
  readonly inputs: Record<string, Destination[]>;
  readonly outputs: Record<string, AudioNode[]>;
}

// a block's jacks: each input its built node's way in by its name, each output its way out
export function blockJacks(node: Node, built: BuiltNode): Jacks {
  return {
    inputs: Object.fromEntries(node.inputs.map(({ name }) => [name, built.inputsOf(name)])),
    outputs: Object.fromEntries(node.outputs.map(({ name }) => [name, [built.output]])),
    paramsOf: (name) => built.cablesOf(name),
  };
}
// A composite's jacks, its wires made: its own nodes where it has them (own), else what its wires lead through it.
export function compositeJacks(node: Node, children: ReadonlyMap<string, Jacks>, own?: OwnJacks): Jacks {
  const collected: Collected = { inputs: {}, outputs: {} };
  for (const wire of node.wires ?? []) {
    wireInside(node, wire, { children, own, collected });
  }
  const paramsOf = (name: string): never => {
    throw new Error(`${node.name}/${name}: a sound into a macro, not built`);
  };
  if (!own) {
    return { ...collected, paramsOf };
  }
  return {
    inputs: Object.fromEntries(Object.entries(own.inputs).map(([name, jack]) => [name, [jack]])),
    outputs: Object.fromEntries(Object.entries(own.outputs).map(([name, jack]) => [name, [jack]])),
    paramsOf,
  };
}
// One wire made inside a composite, by names: from a child's output or its own input, into a child's
// input or param or its own output. Where its own jack has no node, what it leads to is collected.
export function wireInside(
  node: Node,
  { from, to }: Wire,
  {
    children,
    own,
    collected,
  }: { children: ReadonlyMap<string, Jacks>; own?: OwnJacks | undefined; collected?: Collected },
): void {
  const childNamed = (name: string): Jacks => children.get(name)!; // a well-formed plan's child
  const sources = sourcesOf(from, childNamed, own);
  const destinations = destinationsOf(to, childNamed, own);
  if (sources && destinations) {
    sources.forEach((source) => destinations.forEach((destination) => connectInto(source, destination)));
    return;
  }
  if (!sources) {
    const input = (from as { input: string }).input; // none of a child's: its own input
    (collected!.inputs[input] ??= []).push(...(destinations ?? refused(node, input))); // no own node: collected
    return;
  }
  (collected!.outputs[(to as { output: string }).output] ??= []).push(...sources); // none of a child's: its own output
}
// a sound into a node's input or into a param, as Web Audio wires each
export function connectInto(source: AudioNode, destination: Destination): void {
  if ('connect' in destination) {
    source.connect(destination);
  } else {
    source.connect(destination);
  }
}

// where a wire starts inside: a child's output, or its own input's node; none where its own input has none
function sourcesOf(
  from: WireFrom,
  childNamed: (name: string) => Jacks,
  own?: OwnJacks,
): readonly AudioNode[] | undefined {
  if ('node' in from) {
    return childNamed(from.node).outputs[from.output] ?? [];
  }
  const jack = own?.inputs[from.input];
  return jack ? [jack] : undefined;
}
// where a wire ends inside: a child's input or param, or its own output's node; none where its own output has none
function destinationsOf(
  to: WireTo,
  childNamed: (name: string) => Jacks,
  own?: OwnJacks,
): readonly Destination[] | undefined {
  if ('node' in to) {
    return 'param' in to ? childNamed(to.node).paramsOf(to.param) : (childNamed(to.node).inputs[to.input] ?? []);
  }
  const jack = own?.outputs[to.output];
  return jack ? [jack] : undefined;
}
// a wire from a composite's input straight to its output: no node to carry it
function refused(node: Node, input: string): never {
  throw new Error(`${node.name}: its input ${input} wired straight to an output, with nothing between`);
}

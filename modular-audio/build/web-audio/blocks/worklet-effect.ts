// ---------- build/web-audio/blocks/worklet-effect: an effect made by a worklet, in Web Audio ----------
// A worklet node of its processor, one input and one output, its channels following its input's;
// its params the node's AudioParams, set, automated and cabled into as any, a choice by its index.
// None where its worklet isn't loaded: the block that wanted it falls back, or a placeholder passes the sound through.
import { BLOCKS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import type { Making } from '../making.ts';
import type { ProcessorName } from '../worklets.ts';
import { numericOf } from './worklet-source.ts';

// what an effect is made of
interface WorkletEffectMade {
  readonly processor: ProcessorName;
  // what the processor reads once, as it's made
  readonly processorOptions?: object;
  // what it is, for an error's message
  readonly kind: string;
}

// The worklet node made, and the block built of it; null where the worklet isn't loaded.
export function workletEffect(
  node: Node,
  making: Making,
  { processor, processorOptions, kind }: WorkletEffectMade,
): { worklet: AudioWorkletNode; built: BuiltNode } | null {
  const specs = BLOCKS[processor].params;
  const worklet = making.worklets.node(making.context, processor, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    parameterData: Object.fromEntries(specs.map((spec) => [spec.name, numericOf(node, spec)])),
    ...(processorOptions && { processorOptions }),
  });
  if (!worklet) {
    return null;
  }
  making.kept(worklet);
  const params = Object.fromEntries(specs.map(({ name }) => [name, worklet.parameters.get(name)!])); // declared by its processor
  const built = new BuiltNode({
    input: worklet,
    output: worklet,
    params,
    cables: Object.fromEntries(specs.map(({ name }) => [name, [params[name]!]])),
    kind,
  });
  return { worklet, built };
}

// A seed for a processor's own random, drawn from the builder's: one seed, one render.
// Drawn whether or not the worklet is loaded, so what draws after it doesn't depend on what loaded.
export function drawnSeed(making: Making): number {
  return Math.floor(making.random() * 2 ** 32);
}

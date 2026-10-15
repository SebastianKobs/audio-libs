// ---------- build/web-audio/builder: the builder for Web Audio ----------
// Handed a plan, where its sound goes and where its inputs come from, it builds it:
//   1. each block made by its kind (blocks/), at its values and settings;
//   2. a block it can't make a placeholder, its sound passed through, said by its address;
//   3. each composite opened, its wires made by names (wiring.ts);
//   4. its inputs fed from where they come from, its output into where it goes.
// It knows no planner, channel, desk, effect or instrument: only the plan's format and its blocks.
import { addressText, type Address, type Node, type Plan } from '../../plan/format/index.ts';
import type { BlockKind } from '../../plan/blocks/index.ts';
import type { Builder } from '../ports/index.ts';
import { MAKERS } from './blocks/makers.ts';
import { Buffers } from './buffers.ts';
import { WebAudioBuilt } from './built.ts';
import type { Making } from './making.ts';
import { BuiltParts } from './parts.ts';
import { placeholder } from './placeholder.ts';
import { blockJacks, compositeJacks, connectInto, type Jacks } from './wiring.ts';

// what the builder is made with: the context, the beat's length now, the random its noise is drawn from
export interface WebAudioOptions {
  readonly context: BaseAudioContext;
  readonly beat: () => number;
  readonly random?: () => number;
}
// where a plan's sound goes, and where each of its inputs comes from, by name
export interface WebAudioWhere {
  readonly into: AudioNode;
  readonly from?: Readonly<Record<string, AudioNode>>;
}

export class WebAudioBuilder implements Builder<AudioNode> {
  readonly #context: BaseAudioContext;
  readonly #beat: () => number;
  readonly #buffers: Buffers;

  constructor({ context, beat, random = Math.random }: WebAudioOptions) {
    this.#context = context;
    this.#beat = beat;
    this.#buffers = new Buffers(context, random);
  }
  // a plan built, fed from where its inputs come from, its output into where it goes
  build(plan: Plan, { into, from = {} }: WebAudioWhere): WebAudioBuilt {
    const parts = new BuiltParts();
    const making: Making = {
      context: this.#context,
      buffers: this.#buffers,
      beat: this.#beat,
      canPan: typeof this.#context.createStereoPanner === 'function',
      kept: (node) => parts.keep(node),
      started: (source) => parts.start(source),
    };
    const top = this.#jacksOf(plan.node, [], making, parts);
    for (const [name, source] of Object.entries(from)) {
      (top.inputs[name] ?? []).forEach((destination) => connectInto(source, destination));
    }
    for (const output of top.outputs.out ?? []) {
      output.connect(into);
    }
    return new WebAudioBuilt(parts);
  }

  // a node's jacks as built: a composite's children built and wired; a block made, or a placeholder in its place
  #jacksOf(node: Node, at: Address, making: Making, parts: BuiltParts): Jacks {
    if (node.inside) {
      const children = node.inside.children.map(
        (child) => [child.name, this.#jacksOf(child, [...at, child.name], making, parts)] as const,
      );
      return compositeJacks(node, new Map(children));
    }
    const make = MAKERS[node.kind as BlockKind]; // a block's kind, or one it can't make
    if (!make) {
      parts.placeholders.push(at);
    }
    const built = make ? make(node, making) : placeholder(making);
    parts.blocks.set(addressText(at), built);
    return blockJacks(node, built);
  }
}

// ---------- build/web-audio/builder: the builder for Web Audio ----------
// Handed a plan, where its sound goes and where its inputs come from, it builds it:
//   1. each block made by its kind (blocks/), at its values and settings;
//   2. a block it can't make a placeholder, its sound passed through, said by its address;
//   3. each composite opened, its wires made by names (wiring.ts), a node at each of its own jacks
//      where it holds a pool, a copy added and let go later;
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
import { blockJacks, compositeJacks, type Jacks, type OwnJacks } from './wiring.ts';

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
    return new WebAudioBuilt(plan, {
      context: this.#context,
      into,
      from,
      planned: (planned) => {
        const parts = new BuiltParts();
        return { parts, top: this.#jacksOf(planned.node, [], parts) };
      },
      copied: (node, at, copy) => this.#jacksOf(node, at, copy),
    });
  }

  // A node's jacks as built into its parts, kept by its address:
  //   - a composite's children built and wired;
  //     a node at each of its own jacks where it holds a pool;
  //   - a block made, or a placeholder in its place.
  #jacksOf(node: Node, at: Address, parts: BuiltParts): Jacks {
    const jacks = this.#built(node, at, parts);
    parts.jacks.set(addressText(at), jacks);
    return jacks;
  }
  // a node built into its parts, as #jacksOf() has it
  #built(node: Node, at: Address, parts: BuiltParts): Jacks {
    const making = this.#making(parts);
    if (node.inside) {
      const children = new Map(
        node.inside.children.map((child) => [child.name, this.#jacksOf(child, [...at, child.name], parts)]),
      );
      if (!node.inside.pools.length) {
        return compositeJacks(node, children);
      }
      const own = ownJacks(node, making);
      parts.poolHolders.set(addressText(at), { node, children, own });
      return compositeJacks(node, children, own);
    }
    const make = MAKERS[node.kind as BlockKind]; // a block's kind, or one it can't make
    if (!make) {
      parts.placeholders.push(at);
    }
    const before = { nodes: parts.nodes.length, sources: parts.sources.length };
    const built = make ? make(node, making) : placeholder(making);
    parts.blocks.set(addressText(at), built);
    parts.made.set(addressText(at), [...parts.nodes.slice(before.nodes), ...parts.sources.slice(before.sources)]);
    return blockJacks(node, built);
  }
  // what a block's maker is handed, what it makes kept among these parts
  #making(parts: BuiltParts): Making {
    return {
      context: this.#context,
      buffers: this.#buffers,
      beat: this.#beat,
      canPan: typeof this.#context.createStereoPanner === 'function',
      kept: (made) => parts.keep(made),
      started: (source) => parts.start(source),
      followsTempo: (follower) => parts.tempoFollowers.push(follower),
    };
  }
}

// a node at each of a composite's own jacks, a gain at 1, where its pool's copies come and go
function ownJacks(node: Node, making: Making): OwnJacks {
  const gains = (jacks: readonly { name: string }[]): Record<string, AudioNode> =>
    Object.fromEntries(jacks.map(({ name }) => [name, making.kept(making.context.createGain())]));
  return { inputs: gains(node.inputs), outputs: gains(node.outputs) };
}

// ---------- build/web-audio/parts: the parts of what's built ----------
// Every node made, every source started, each block by its address, the placeholders put in, what
// follows a new tempo: what's built is taken apart by them, set by its blocks' addresses, told a tempo.
import type { Address, Node } from '../../plan/format/index.ts';
import type { BuiltNode } from './built-node.ts';
import type { TempoFollower } from './making.ts';
import type { Jacks, OwnJacks } from './wiring.ts';

// a composite holding a pool, as built: its node, its children's jacks by name, copies among them as they come, a node at each of its own jacks
export interface PoolHolder {
  readonly node: Node;
  readonly children: Map<string, Jacks>;
  readonly own: OwnJacks;
}

export class BuiltParts {
  readonly nodes: AudioNode[] = [];
  readonly sources: AudioScheduledSourceNode[] = [];
  readonly blocks = new Map<string, BuiltNode>(); // by its address as text
  readonly placeholders: Address[] = [];
  readonly tempoFollowers: TempoFollower[] = [];
  readonly poolHolders = new Map<string, PoolHolder>(); // by its address as text

  // a copy's parts taken in among these: its blocks, its placeholders, what follows a new tempo
  takeIn(copy: BuiltParts): void {
    copy.blocks.forEach((built, at) => this.blocks.set(at, built));
    this.placeholders.push(...copy.placeholders);
    this.tempoFollowers.push(...copy.tempoFollowers);
  }
  // and given back as it's let go
  giveBack(copy: BuiltParts): void {
    copy.blocks.forEach((_, at) => this.blocks.delete(at));
    removeAll(this.placeholders, copy.placeholders);
    removeAll(this.tempoFollowers, copy.tempoFollowers);
  }
  // taken apart: its sources stopped, its nodes disconnected
  takeApart(): void {
    for (const source of this.sources) {
      source.stop();
    }
    for (const node of this.nodes) {
      node.disconnect();
    }
  }
  // a node made, kept to take apart with the rest
  keep<Made extends AudioNode>(node: Made): Made {
    this.nodes.push(node);
    return node;
  }
  // a source started now, kept to stop with the rest
  start<Source extends AudioScheduledSourceNode>(source: Source): Source {
    source.start();
    this.sources.push(source);
    return source;
  }
}

// the items of one list taken out of another, each as it is
function removeAll<Item>(list: Item[], gone: readonly Item[]): void {
  for (const item of gone) {
    list.splice(list.indexOf(item), 1);
  }
}

// ---------- build/web-audio/parts: the parts of what's built ----------
// Every node made, every source started, each block by its address, the placeholders put in:
// what's built is taken apart by them, and set by its blocks' addresses.
import type { Address } from '../../plan/format/index.ts';
import type { BuiltNode } from './built-node.ts';

export class BuiltParts {
  readonly nodes: AudioNode[] = [];
  readonly sources: AudioScheduledSourceNode[] = [];
  readonly blocks = new Map<string, BuiltNode>(); // by its address as text
  readonly placeholders: Address[] = [];

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

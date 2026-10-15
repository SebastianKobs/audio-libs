// ---------- plan/blocks/block: a building block, declared ----------
// A node with no inside: what every builder has to build, or put a placeholder in for.
// Declared by its kind: its inputs and outputs, its params' specs, its settings'.
import type { ParamSpec } from '../../params/index.ts';
import type { Channels } from '../format/index.ts';

// a block's input or output: its name; its channels where the block fixes them,
// else as they come, the plan's node saying
export interface Jack {
  readonly name: string;
  readonly channels?: Channels;
}
// a block: its kind, its inputs and outputs, its params and its settings, each a spec
export interface Block {
  readonly kind: string;
  readonly inputs: readonly Jack[];
  readonly outputs: readonly Jack[];
  readonly params: readonly ParamSpec[];
  readonly settings: readonly ParamSpec[];
}

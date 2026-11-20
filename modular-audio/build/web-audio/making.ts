// ---------- build/web-audio/making: what a block's maker is handed ----------
// The context and its buffers, the beat, whether it can pan, the random a noise draws from, the worklets, the shapers' lags; and
// hands for what it makes:
//   - kept(): a node made, taken apart with the rest;
//   - started(): a source, started at its time with the rest, by its own way where it has one,
//     stopped by a time with the rest, by its own way where it has one, stopped as it's taken apart;
//   - followsTempo(): what follows a new beat, a synced delay's time, a synced oscillator's rate.
// And a block's values and settings read from its node, what a plan leaves out at its block's
// declared default; its values set on what's built.
import type { When } from '../../../base/automation/index.ts';
import { BLOCKS, type Block, type BlockKind } from '../../plan/blocks/index.ts';
import type { Node } from '../../plan/format/index.ts';
import type { Buffers } from './buffers.ts';
import type { BuiltNode } from './built-node.ts';
import type { Lags } from './shaper-lags.ts';
import type { Worklets } from './worklets.ts';

// what a maker is handed
export interface Making {
  readonly context: BaseAudioContext;
  readonly buffers: Buffers;
  readonly beat: () => number;
  readonly canPan: boolean;
  readonly random: () => number;
  readonly worklets: Worklets;
  readonly shaperLags: Lags;
  kept<Made extends AudioNode>(node: Made): Made;
  started<Source extends ScheduledSource>(source: Source, startAt?: StartAt, stopBy?: StopBy): Source;
  followsTempo(follower: TempoFollower): void;
}
// A source as a block's maker starts it: an oscillator's or a buffer's, which are nodes, or one whose
// processor is told by message, which isn't.
export interface ScheduledSource {
  start(when?: number): void;
  stop(when?: number): void;
}
// a source's own way of starting at its time, now where none
export type StartAt = (at: number | undefined) => void;
// a source's own way of being stopped by a time, as what it plays into has gone silent: no later
// than its own stop
export type StopBy = (at: number) => void;
// what follows a new beat: told it, when it lands, and the context's time now
export type TempoFollower = (beat: number, when: When, now: number) => void;
// a block's maker: its node as planned, made in Web Audio; none where it can't be made, a worklet's that hasn't
// loaded, and a placeholder is put in its place
export type Maker = (node: Node, making: Making) => BuiltNode | null;

// a block's param's value as it starts, by its name; its block's default where a plan leaves it out
export function valueOf(node: Node, name: string): number | string | undefined {
  return node.params.find((param) => param.spec.name === name)?.value ?? declaredOf(node, 'params', name);
}
// a block's param's value as it starts, a number
export function numberOf(node: Node, name: string): number {
  return Number(valueOf(node, name));
}
// a block's setting, by its name; its block's default where a plan leaves it out
export function settingOf(node: Node, name: string): number | string | undefined {
  return node.settings.find((setting) => setting.spec.name === name)?.value ?? declaredOf(node, 'settings', name);
}
// what a block declares a param or a setting to start at
function declaredOf(node: Node, list: 'params' | 'settings', name: string): number | string | undefined {
  const declared: readonly { name: string; default?: number | string }[] | undefined =
    BLOCKS[node.kind as BlockKind]?.[list]; // a block's kind, or one no builder makes
  return declared?.find((spec) => spec.name === name)?.default;
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
// A node as a block it stands in for plans it: that block's kind, its params at the values given and the block's defaults
// where none is, its settings at the choices given and the block's defaults where none is.
export function standingIn(
  node: Node,
  plan: Block,
  { values, choices }: { values: Readonly<Record<string, number>>; choices: Readonly<Record<string, string>> },
): Node {
  return {
    ...node,
    kind: plan.kind,
    params: plan.params.map((spec) => ({ spec, value: values[spec.name] ?? spec.default ?? 0 })),
    settings: plan.settings.map((spec) => ({ spec, value: choices[spec.name] ?? spec.default ?? '' })),
  };
}

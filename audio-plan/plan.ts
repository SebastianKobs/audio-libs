// ---------- libs/audio-plan/plan: an audio plan, a graph as data ----------
// An audio plan is a graph, as data (AudioPlan): its nodes, each of a kind Web Audio has (NodeKind), with its props, its params' values
// and automation, its starts and stops, and the block it belongs to; its edges, by sound or into a param, 'out' being its one output;
// and its input, where it has one. Times are seconds from its start. What a sounding one is told (Operation): a param's new automation,
// or a node's stop. A synth's note's plan is one, with what a voice adds (libs/synth/plan.ts, W0)
import type { Seconds } from '../clock/index.ts';

// a param's automation, as Web Audio's: ['set', value, at], ['exp' | 'linear', value, at], ['target', value, at, tc], ['value', value],
// ['cancel', at]; times in seconds from the plan's start
export type Automation =
  | [kind: 'value', value: number]
  | [kind: 'set' | 'exp' | 'linear', value: number, at: number]
  | [kind: 'target', value: number, at: number, timeConstant: number]
  | [kind: 'cancel', at: number];
// a buffer a plan's node names, the engine making it: so many seconds of white noise, or a reverb's impulse response, noise darkening as it
// decays (W2b)
export type BufferSpec = { noise: Seconds } | { impulse: Seconds };
// the kinds of node a plan names, each one of Web Audio's but a limiter, built from several (libs/web-audio-engine/)
export type NodeKind = 'oscillator' | 'gain' | 'biquad' | 'buffer' | 'panner' | 'delay' | 'convolver' | 'limiter';
export interface PlanNode {
  id: number;
  node: NodeKind;
  block: string;
  props: Record<string, unknown>;
  params: Record<string, Automation[]>;
  starts: ([] | [at: number] | [at: number, offset: number])[]; // at once (a background), or at, from an offset into a buffer
  stops: [at: number][];
}
// from a node, into a node, into a node's param, or out
export type Edge = [from: number, to: number | [id: number, param: string] | 'out'];
// what a sounding plan is told: a param's new automation, or a node's stop
export interface Operation {
  id: number;
  param?: string | undefined;
  events?: Automation[];
  stop?: number;
}
// a graph of audio nodes: what an engine builds and wires; its input, where its sound comes in, an FX module's
export interface AudioPlan {
  nodes: PlanNode[];
  edges: Edge[];
  input?: number | null;
}

// a source's latest stop; none, it sounds for good
export function lastStop(node: PlanNode): number {
  if (!node.stops.length) {
    return Infinity;
  }
  return Math.max(...node.stops.map(([at]) => at));
}

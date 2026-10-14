// ---------- libs/web-audio-engine/build: a plan's nodes made, started, wired and automated ----------
// A plan's node (libs/synth/) made by its kind (nodes.ts), in one shape (built-node.ts):
//   1. its props set by name, a buffer the one it names (buffers.ts);
//   2. its params automated by name;
//   3. a source started and stopped at its times;
//   4. wired by the plan's edges: into another's input or param, or out where its sound goes.
// A handle's operations run on them later, by the node's id (index.ts, apply()).
import type { BuiltNode, WebAudioNode } from './built-node.ts';
import { MADE_WITH, type NodeMaker } from './nodes.ts';
import type { Automatable } from './param-in-units.ts';
import type { Automation, BufferSpec, Edge, NodeKind, PlanNode } from '../audio-plan/index.ts';

// what building a node asks of the engine: the kinds it makes, and a buffer a plan names, made once
export interface Building {
  makers: Readonly<Record<NodeKind, NodeMaker>>;
  buffer(spec: BufferSpec): AudioBuffer;
}

// A plan's node, made by its kind, its params automated from t.
// One of Web Audio's also has its props set, and is started and stopped at its times.
export function buildNode(planned: PlanNode, t: number, building: Building): BuiltNode {
  const make = building.makers[planned.node];
  if (!make) {
    throw new Error(`a node the engine can't make: ${planned.node}`);
  }
  const built = make(planned.props);
  if (built.node) {
    setProps(built.node, planned.props, building);
  }
  for (const [name, events] of Object.entries(planned.params)) {
    const param = built.param(name);
    if (param) {
      automate(param, events, t); // none: a panner made a gain, where the context can't pan
    }
  }
  if (built.node) {
    startAndStop(built.node, planned, t);
  }
  return built;
}
// a Web Audio node's props, by the plan's names, but those it was made with; a buffer the one it names
function setProps(node: WebAudioNode, props: Record<string, unknown>, building: Building): void {
  for (const [prop, value] of Object.entries(props)) {
    if (MADE_WITH.has(prop)) {
      continue;
    }
    if (prop === 'buffer') {
      node[prop] = building.buffer(value as BufferSpec);
    } else {
      node[prop] = value;
    }
  }
}
// a source started and stopped at its plan's times, after t: at once, or at a time from an offset into a buffer
function startAndStop(node: WebAudioNode, planned: PlanNode, t: number): void {
  for (const start of planned.starts) {
    if (start.length === 0) {
      node.start!(); // a plan starts only its sources
    } else {
      const [at, ...rest] = start;
      node.start!(t + at, ...rest);
    }
  }
  for (const [at] of planned.stops) {
    node.stop!(t + at);
  }
}
// a built node's param by the plan's name, as an operation names it
export function paramOf(node: BuiltNode, name: string): Automatable {
  const param = node.param(name);
  if (!param) {
    throw new Error(`no param ${name} on ${node.kind}`);
  }
  return param;
}
export function automate(param: Automatable, events: Automation[], t: number): void {
  for (const [kind, value, at, timeConstant] of events) {
    if (kind === 'value') {
      param.value = value;
    } else if (kind === 'set') {
      param.setValueAtTime(value, t + at);
    } else if (kind === 'exp') {
      param.exponentialRampToValueAtTime(value, t + at);
    } else if (kind === 'linear') {
      param.linearRampToValueAtTime(value, t + at);
    } else if (kind === 'target') {
      param.setTargetAtTime(value, t + at, timeConstant);
    } else if (kind === 'cancel') {
      param.cancelScheduledValues(t + value);
    }
  }
}
// an edge's end: the destination, a node's param by name, or a node
export function connectEdge(
  source: BuiltNode,
  to: Edge[1],
  nodes: BuiltNode[],
  destination: AudioNode | undefined,
): void {
  if (to === 'out') {
    if (destination) {
      source.output.connect(destination); // with none, its caller's to wire
    }
  } else if (Array.isArray(to)) {
    const [id, param] = to;
    source.output.connect(nodeOf(nodes, id).cableable(param));
  } else {
    source.output.connect(nodeOf(nodes, to).input);
  }
}
// a plan's node by its id, as its edges and a handle's operations name it
export function nodeOf(nodes: BuiltNode[], id: number): BuiltNode {
  const node = nodes[id];
  if (!node) {
    throw new Error(`no node ${id} in the plan`);
  }
  return node;
}

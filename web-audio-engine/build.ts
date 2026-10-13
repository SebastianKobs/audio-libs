// ---------- libs/web-audio-engine/build: a plan's nodes made, started, wired and automated ----------
// A plan's node (libs/synth/) made by its kind (nodes.ts), its props set by name, a buffer the one it names (buffers.ts), its params
// automated by name, a source started and stopped at its times; then wired by the plan's edges, into another's input or param, or out
// to where its sound goes. A handle's operations run on them later, by the node's id (index.ts, apply())
import { CompositeNode } from './composite.ts';
import type { NodeMaker } from './nodes.ts';
import type { Automatable } from './param-in-units.ts';
import type { Automation, BufferSpec, Edge, NodeKind, PlanNode } from '../audio-plan/index.ts';

// a node built from a plan: a Web Audio node, its props set by name (a wave's type, a buffer, a loop), its params by name; or one built
// from several (composite.ts), a limiter
export type BuiltNode = WebAudioNode | CompositeNode;
type WebAudioNode = AudioNode & Scheduled & Record<string, unknown>;
// what a source has: started and stopped at its times (an oscillator, a buffer: its offset and duration after its time)
interface Scheduled {
  start?: (...times: number[]) => void;
  stop?: (when?: number) => void;
}
// what building a node asks of the engine: the kinds it makes, and a buffer a plan names, made once
export interface Building {
  makers: Readonly<Record<NodeKind, NodeMaker>>;
  buffer(spec: BufferSpec): AudioBuffer;
}

// props a node is made with, not set on it
const MADE_WITH: ReadonlySet<string> = new Set(['max', 'mono']);

// a plan's node, made by its kind and started at the plan's times from t, its props and params set; one made of several, its params only
export function buildNode(planned: PlanNode, t: number, building: Building): BuiltNode {
  const make = building.makers[planned.node];
  if (!make) {
    throw new Error(`a node the engine can't make: ${planned.node}`);
  }
  const made = make(planned.props);
  if (made instanceof CompositeNode) {
    for (const [param, events] of Object.entries(planned.params)) {
      automate(paramOf(made, param), events, t);
    }
    return made; // made of several, with no props, starts or stops
  }
  const node = made as WebAudioNode; // Web Audio's node, its props and params by the plan's names
  setProps(node, planned.props, building);
  for (const [param, events] of Object.entries(planned.params)) {
    const target = node[param];
    if (isParam(target)) {
      automate(target, events, t);
    }
  }
  startAndStop(node, planned, t);
  return node;
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
// a param read by name: one that can be automated, a Web Audio AudioParam or a stand-in's
function isParam(value: unknown): value is AudioParam {
  return typeof value === 'object' && value !== null && 'setTargetAtTime' in value;
}
export function paramOf(node: BuiltNode, name: string): Automatable {
  if (node instanceof CompositeNode) {
    const param = node.params[name];
    if (!param) {
      throw new Error(`no param ${name} on a node made of several`);
    }
    return param;
  }
  const param = node[name];
  if (!isParam(param)) {
    throw new Error(`no param ${name} on a ${node.constructor.name}`);
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
  const output = outputOf(source);
  if (to === 'out') {
    if (destination) {
      output.connect(destination); // with none, its caller's to wire
    }
  } else if (Array.isArray(to)) {
    const [id, param] = to;
    output.connect(cableableParamOf(nodeOf(nodes, id), param));
  } else {
    output.connect(inputOf(nodeOf(nodes, to)));
  }
}
// a param a sound can be cabled into: Web Audio's own, not one in a plan's units
function cableableParamOf(node: BuiltNode, name: string): AudioParam {
  if (node instanceof CompositeNode) {
    throw new Error(`${name}: not a param a sound can be cabled into, on a node made of several`);
  }
  return paramOf(node, name) as AudioParam; // a Web Audio node's: its own
}
// a plan's node by its id, as its edges and a handle's operations name it
export function nodeOf(nodes: BuiltNode[], id: number): BuiltNode {
  const node = nodes[id];
  if (!node) {
    throw new Error(`no node ${id} in the plan`);
  }
  return node;
}
// where a built node's sound comes in, and where it goes out: a Web Audio node's both itself
export function inputOf(node: BuiltNode): AudioNode {
  return node instanceof CompositeNode ? node.input : node;
}
export function outputOf(node: BuiltNode): AudioNode {
  return node instanceof CompositeNode ? node.output : node;
}
// a node an operation stops: a source, one of Web Audio's
export function sourceOf(node: BuiltNode): WebAudioNode {
  if (node instanceof CompositeNode) {
    throw new Error('a node made of several stops with what plays into it');
  }
  return node;
}

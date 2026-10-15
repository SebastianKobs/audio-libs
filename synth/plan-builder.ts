// ---------- libs/synth/plan-builder: the builder a note's plan is made in ----------
// Blocks plan into the builder, and connect by ports: a port is a name another block can send its sound into ('vca', 'ring 1', 'out'), or
// move ('osc 1.detune', 'oscs.detune', 'filter.frequency'). A block offers its ports, and asks for connections by name; they're made at
// the end, once every block has offered its own, so blocks can be planned in any order. 'chain' is the chain's first stage, or out.
// Envelopes (blocks/envelope.ts, shapes.ts) are written onto the ports they're cabled to at the end too; then what a block left for later
// (an osc's glides). An instrument's out (blocks/out.ts) is the last thing before its output: 'out' goes through it.
// A stage can go out from another node than it comes in at (exit): a delay line goes in at its delay and out from its loop's lowpass.
import { mtof } from '../music-theory/index.ts';
import { time, val, when, type Valued, type Values } from './values.ts';
import { events, kindOf, released, type Scale } from './shapes.ts';
import type { Envelope, Patch } from './patch.ts';
import { SMOOTHING, lastStop, type Edge, type NodeKind, type Operation, type PlanNode } from '../audio-plan/index.ts';
import { eventOf, type Automation } from '../automation/index.ts';
import type { Handles, Plan } from './plan.ts';
import type { ParamSpec, ParamSpecs } from '../params/index.ts';
import { NOTE_SPECS } from './blocks/note.ts';
import { entryOf } from '../util/index.ts';
import { SILENCE } from '../params/index.ts';

interface Port {
  node: PlanNode;
  param?: string | undefined;
  scale: Scale;
}
// a block (blocks/): where in a patch it's written (key), whether as a list (many), whether every instrument has it, written or not
// (out), its values' params (params.ts), and how it plans a spec of its into the builder, index counting from 1 in a list
export interface Block<Spec = unknown> {
  key: keyof Patch;
  many?: boolean;
  everyInstrument?: true;
  paramSpecs: ParamSpec | ParamSpecs;
  plan(spec: Spec, builder: PlanBuilder, index: number, patch: Patch): void;
}

// a note's plan in the making: its blocks plan into it (Block), then build(chain) makes their connections and gives the plan
export class PlanBuilder {
  readonly values: Values;
  readonly continuous: boolean;
  readonly transpose: number;
  readonly frequency: number; // the note's frequency, transposed; an FX module plays no note: NaN, unused
  readonly velocity: number; // a background has no velocity
  readonly oscs: PlanNode[] = []; // every osc the oscs plan, which the handle glides
  readonly sources: PlanNode[] = []; // what sounds and has to be stopped: oscs, LFOs, noise, FM's and ring's modulators
  readonly #patch: Patch;
  readonly #moved: ReadonlySet<string>; // the ports an envelope block moves, known before the blocks plan
  readonly #nodes: PlanNode[] = [];
  readonly #edges: Edge[] = [];
  readonly #ports = new Map<string, Port[]>();
  readonly #exits = new Map<string, PlanNode>();
  readonly #asked: { from: PlanNode; port: string }[] = []; // connections asked for by port, made once every block has offered its own
  readonly #envelopes: Envelope[] = [];
  readonly #leftForLater: (() => void)[] = [];
  readonly #handles: Handles = {};
  readonly #derived = new Set<PlanNode>(); // the sources stopped where what gates them fades (G0.3), not by a stop written

  constructor(patch: Patch, values: Values, moved: ReadonlySet<string> = new Set()) {
    this.#patch = patch;
    this.#moved = moved;
    this.values = values;
    this.continuous = !!patch.note?.continuous;
    this.transpose = patch.note?.transpose ?? NOTE_SPECS.transpose.default;
    this.frequency = mtof((values.pitch ?? NaN) + this.transpose);
    this.velocity = this.continuous ? 1 : (values.velocity ?? NaN);
  }
  // whether an envelope block moves a port, so the block that offers it builds it for one (an osc's level)
  moves(port: string): boolean {
    return this.#moved.has(port);
  }
  node(kind: NodeKind, block: string, props: Record<string, unknown> = {}): PlanNode {
    const node = { id: this.#nodes.length, node: kind, block, props, params: {}, starts: [], stops: [] };
    this.#nodes.push(node);
    return node;
  }
  automate(node: PlanNode, name: string, ...events: Automation[]): void {
    (node.params[name] ??= []).push(...events);
  }
  value(node: PlanNode, name: string, value: number): void {
    this.automate(node, name, ['value', value]);
  }
  // straight from one node to another, within a block
  link(from: PlanNode, to: PlanNode, param?: string): void {
    this.#edges.push([from.id, param ? [to.id, param] : to.id]);
  }
  // scale: what an envelope of it makes of its amount (shapes.ts): its kind, by its param; its own value, an osc's frequency, a cutoff or a
  // gain's level; where a gain rests (FM's index); and its silence where a level comes after it
  offer(name: string, node: PlanNode, param?: string, scale: Scale = {}): void {
    entryOf(this.#ports, name, () => []).push({
      node,
      param,
      scale: param ? { kind: kindOf(param), ...scale } : scale,
    });
  }
  // A param an envelope may move (blocks/envelope.ts), offered at its port by its scale.
  // It's set to its value only where no envelope moves the port, and a value is given.
  movable(
    node: PlanNode,
    param: string,
    { port, value, scale }: { port: string; value: number | undefined; scale: Scale },
  ): void {
    if (value !== undefined && !this.moves(port)) {
      this.value(node, param, value);
    }
    this.offer(port, node, param, scale);
  }
  // A level's gain (an osc's, a noise's), its port '<block>.gain'.
  // At its level, or at an envelope's full scale where one moves it.
  levelGain(block: string, level: Valued<number> | undefined): PlanNode {
    const gain = this.node('gain', block);
    const value = level === undefined ? undefined : val(level, this.values);
    this.movable(gain, 'gain', { port: `${block}.gain`, value, scale: { base: value ?? 1 } });
    return gain;
  }
  // where a stage goes out, when that isn't where it comes in
  exit(name: string, node: PlanNode): void {
    this.#exits.set(name, node);
  }
  into(from: PlanNode, port = 'chain'): void {
    this.#asked.push({ from, port });
  }
  // from: where in the patch it was written, for an editor
  envelope(envelope: Envelope): void {
    this.#envelopes.push(envelope);
  }
  later(fn: () => void): void {
    this.#leftForLater.push(fn);
  }
  start(node: PlanNode, offset?: number): void {
    if (this.continuous) {
      node.starts.push([]); // a background starts at once
    } else if (offset === undefined) {
      node.starts.push([0]);
    } else {
      node.starts.push([0, offset]);
    }
  }
  stop(node: PlanNode, at: Parameters<typeof time>[0] | undefined): void {
    if (at !== undefined) {
      node.stops.push([time(at, this.values)]);
    }
  }
  handle<Name extends keyof Handles>(name: Name, fn: NonNullable<Handles[Name]>): void {
    this.#handles[name] = fn;
  }
  // the chain's stages, each into the next in the patch's order, the last out, through out's gain if there is one; then every connection
  // asked for, by its port
  build(chain: string[]): Plan {
    const present = chain.filter((stageName) => stageName !== 'out' && this.#stage(stageName));
    const out = this.#linkChain(present);
    this.#writeEnvelopes();
    for (const fn of this.#leftForLater) {
      fn();
    }
    this.#connectAsked(present, out);
    this.#stopOnceSilent();
    const handles = this.#handlesNow();
    return {
      nodes: this.#nodes,
      edges: this.#edges,
      handle: handles,
      ports: this.#portList(),
      controls: this.#controls(),
      ...(this.#patch.effect ? { input: this.#inputOf(present[0]) } : {}),
    };
  }
  // a stage's node, where it takes its sound in: its port's with no param
  #stage(stageName: string): PlanNode | undefined {
    return this.#ports.get(stageName)?.find((port) => !port.param)?.node;
  }
  // the chain's stages, each into the next, the last out, through out's gain if there is one. Returns where out is: its gain, or out
  #linkChain(present: string[]): number | 'out' {
    const volume = this.#stage('out');
    const out = volume ? volume.id : 'out';
    present.forEach((stageName, index) => {
      const next = present[index + 1];
      const into = next === undefined ? out : this.#stage(next)!.id; // the next stage's, or out
      this.#edges.push([(this.#exits.get(stageName) ?? this.#stage(stageName)!).id, into]);
    });
    if (volume) {
      this.#edges.push([volume.id, 'out']);
    }
    return out;
  }
  // each envelope written onto the ports it's cabled to
  #writeEnvelopes(): void {
    for (const envelope of this.#envelopes) {
      for (const { node, param, scale } of this.#portsNamed(envelope.target!)) {
        this.automate(node, param!, ...events(envelope, this, scale));
      }
    }
  }
  // every connection asked for, by its port: 'chain' the chain's first stage, or out
  #connectAsked(present: string[], out: number | 'out'): void {
    for (const { from, port } of this.#asked) {
      const name = port === 'chain' ? (present[0] ?? 'out') : port;
      if (name === 'out') {
        this.#edges.push([from.id, out]);
        continue;
      }
      for (const { node, param } of this.#portsNamed(name)) {
        this.#edges.push([from.id, param ? [node.id, param] : node.id]);
      }
    }
  }
  // a port's nodes, by its name: one a block offers
  #portsNamed(name: string): Port[] {
    const offered = this.#ports.get(name);
    if (!offered) {
      throw new Error(`a port no block offers: ${name}`);
    }
    return offered;
  }
  // its handle, where the patch has one for this note and a block made it
  #handlesNow(): Handles | null {
    const patch = this.#patch;
    return patch.handle && when(patch.handle, this.values) && Object.keys(this.#handles).length ? this.#handles : null;
  }
  #portList(): Plan['ports'] {
    return Object.fromEntries(
      [...this.#ports].map(([name, at]) => [name, at.map(({ node, param }) => ({ id: node.id, param }))]),
    );
  }
  // an FX module's first stage
  #inputOf(first: string | undefined): number | null {
    return first === undefined ? null : this.#stage(first)!.id;
  }
  // its controls: a port moved while it sounds (set()), and the note let go (release())
  #controls(): Plan['controls'] {
    return {
      set: (port: string, value: number, at: number, tc = SMOOTHING): Operation[] =>
        this.#portsNamed(port)
          .filter((offered) => offered.param)
          .map(({ node, param }) => ({ id: node.id, param, events: [eventOf({ value, t: at, glide: tc })] })),
      release: (at: number): Operation[] => this.#release(at),
    };
  }
  // let go: each envelope with a release cancelled from then and released from there, no earlier than the note's shortest; nothing once
  // its end has come, released there already; each source stopped where what gates it fades now (G0.3): a gate silent already stays
  // closed where it was, one the release takes over closes once its release has faded, and a source nothing gates stops as the last
  // release fades, the voice done. A stop written is cut once the last release has faded, never moved later (G0i2). With no release, it
  // rings out
  #release(at: number): Operation[] {
    const from = Math.max(at, this.#patch.note?.shortest ?? NOTE_SPECS.shortest.default);
    const end = this.values.duration;
    if (end !== undefined && from >= end) {
      return [];
    }
    const { ops, faded, closing } = this.#releasedFrom(from);
    if (!ops.length) {
      return [];
    }
    const closed = this.#closedGains();
    for (const [id, at] of closing) {
      const before = closed.get(id);
      if (before === undefined || before > from) {
        closed.set(id, at); // a gain silent before the release stays closed where it was
      }
    }
    const graph = { onward: this.#onward(), closed, visiting: new Set<number>() };
    return [...ops, ...this.sources.flatMap((source) => this.#stopAsLetGo(source, faded, graph))];
  }
  // a source's stop as the note is let go: a stop written cut once the last release has faded, never moved later; else where what gates
  // it fades now, as the last release fades at the latest; nothing where its stop is there already
  #stopAsLetGo(source: PlanNode, faded: number, graph: Parameters<typeof silentFrom>[1]): Operation[] {
    if (source.stops.length && !this.#derived.has(source)) {
      return lastStop(source) > faded ? [{ id: source.id, stop: faded }] : [];
    }
    const silent = Math.min(silentFrom(source.id, graph), faded);
    if (!(silent >= 0) || (source.stops.length && lastStop(source) === silent)) {
      return [];
    }
    return [{ id: source.id, stop: silent }];
  }
  // each envelope with a release, released from a note-off at from: its operations, when the last has faded, and when each gain it moves
  // closes, by its node's id
  #releasedFrom(from: number): { ops: Operation[]; faded: number; closing: Map<number, number> } {
    const ops: Operation[] = [];
    const closing = new Map<number, number>();
    let faded = from;
    for (const envelope of this.#envelopes.filter((written) => written.release !== undefined)) {
      for (const { node, param, scale } of this.#portsNamed(envelope.target!)) {
        const release = released(envelope, this, { from, scale });
        ops.push({ id: node.id, param, events: [['cancel', from], ...release.automation] });
        faded = Math.max(faded, release.faded);
        if (param === 'gain') {
          closing.set(node.id, Math.max(closing.get(node.id) ?? from, release.faded));
        }
      }
    }
    return { ops, faded, closing };
  }
  // each source with no stop written stopped once it's silent for good, where whatever gates it has faded (G0.3): its own gain's envelope
  // where that fades to nothing, else what it feeds, the VCA, a ring; an FM modulator and an LFO with the sound they move; a note with a
  // length once its release has faded (G0c2). Held at a sustain, it sounds until it's let go (release()); a sound that runs on (an
  // FX module) isn't stopped
  #stopOnceSilent(): void {
    if (this.continuous) {
      return;
    }
    const onward = this.#onward();
    const closed = this.#closedGains();
    for (const source of this.sources.filter((node) => !node.stops.length)) {
      const silent = silentFrom(source.id, { onward, closed, visiting: new Set() });
      if (Number.isFinite(silent)) {
        source.stops.push([silent]);
        this.#derived.add(source);
      }
    }
  }
  // where each node sends what it makes, by its id: on to another node, its sound or a param it moves, or out
  #onward(): Map<number, (number | 'out')[]> {
    const onward = new Map<number, (number | 'out')[]>();
    for (const [from, to] of this.#edges) {
      const next = Array.isArray(to) ? to[0] : to;
      onward.set(from, [...(onward.get(from) ?? []), next]);
    }
    return onward;
  }
  // each gain whose envelope fades to nothing, and from when: its last ramp down to its silence, nothing after it
  #closedGains(): Map<number, number> {
    const closed = new Map<number, number>();
    for (const offered of this.#ports.values()) {
      for (const { node, scale } of offered.filter((port) => port.param === 'gain')) {
        const last = node.params.gain?.at(-1);
        if (
          last
          && (last[0] === 'set' || last[0] === 'exp' || last[0] === 'linear')
          && last[1] <= (scale.silence ?? SILENCE)
        ) {
          closed.set(node.id, last[2]);
        }
      }
    }
    return closed;
  }
}
// from when what a node sends on is silent for good: from when a gain it is closes, or as late as the latest of where it goes; out never
// silent, a loop never silent of itself, a node that goes nowhere silent from the start
function silentFrom(
  id: number,
  graph: { onward: Map<number, (number | 'out')[]>; closed: Map<number, number>; visiting: Set<number> },
): number {
  const { onward, closed, visiting } = graph;
  if (visiting.has(id)) {
    return Infinity;
  }
  visiting.add(id);
  const latest = Math.max(...(onward.get(id) ?? []).map((to) => (to === 'out' ? Infinity : silentFrom(to, graph))));
  visiting.delete(id);
  return Math.min(closed.get(id) ?? Infinity, latest);
}

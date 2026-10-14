// ---------- libs/web-audio-fx: FX modules, chained between two points: an FX channel's, a strip's inserts, the master's ----------
// An FX module is a patch (libs/synth/, effect: true) with an input and an output: a delay line, a reverb, an insert. new FxChain() plans
// a chain of them and builds it between two points (between): where it starts (input) and its way out (chainOut), an FX channel of the
// mixer's between its input and its inserts, or its level, or any other two, in order, each into the next.
// modules: [{ name, patch, params }], params a function, read each time the chain is built, so a setting bound to one is read as it is
// then. context: a module's, a beat's length and random(); it plays no note. tempo(beat) glides what follows the beat (a delay line's time);
// set(port, value, timeConstant) glides a port of every module that has it (a delay's feedback), setAt(port, value, at) sets it at a time,
// setNow(port, value) now, as a param's value is set; time() is the first delay line's time now, in
// seconds, and feedback() its feedback. rebuild() plans and builds the chain again, from its patches as they are now (an editor changed one): the new chain is built
// beside the old, where it starts moves over to it, and the old one rings out (RING_OUT) before it's let go, so its repeats aren't
// cut off. plans() for an editor's flow; points() and readings() what its modules offer to read. Times start at the context's now.
// As they play: the FX modules (modules.ts, FxModules), and a device's params (device-params.ts, DeviceParams).
import {
  plan as planPatch,
  type Patch,
  type Plan,
  time,
  val,
  type Context,
  type Params,
  type Values,
  type Delay,
} from '../synth/index.ts';
import type { Operation } from '../audio-plan/index.ts';
import {
  inputOf,
  outputOf,
  paramOf,
  sourceOf,
  type BuiltNode,
  type Engine,
  type Automatable,
} from '../web-audio-engine/index.ts';
import { MOVE_GLIDE } from './module.ts';
export { FILTER, GAIN, INSERTS, LIMITER, LIMITER_SETTINGS, PAN, PAN_PARAMS, PAN_POT, UTILITY } from './inserts.ts';
export { BuiltModule, MOVE_GLIDE } from './module.ts';
export { FxModules } from './modules.ts';
export { DeviceParams } from './device-params.ts';
export { TEMPO_TIME } from './tempo.ts';
export type { InsertModule, InsertParamSpec, LimiterSettings } from './inserts.ts';

// a module in a chain: its name, its patch, and its params, read each time the chain is built
export interface Module {
  name: string;
  patch: Patch;
  params?: () => Params; // its device's parameters, as they are now
}
// a module as built in the chain: its plan, and the nodes the engine made of it
interface Part {
  module: Module;
  plan: Plan;
  made: BuiltNode[];
}
// the chain as built: its parts, in order, and its first node, where it starts goes in
interface Built {
  parts: Part[];
  first: AudioNode;
}
type ChainEngine = Pick<Engine, 'now' | 'build' | 'apply'>;
// a built node that offers points a meter reads inside it, and readings of itself
type Offering = BuiltNode & {
  readonly points: Readonly<Record<string, AudioNode>>;
  readonly readings: Readonly<Record<string, () => number>>;
};
// the two points a chain is built between: where it starts, and its way out (an FX channel is one)
interface ChainEnds {
  readonly input: AudioNode;
  readonly chainOut: AudioNode;
}

export const RING_OUT = 8000; // ms an old chain rings out after a rebuild before it's let go

export class FxChain {
  readonly #engine: ChainEngine;
  readonly #between: ChainEnds;
  readonly #modules: Module[];
  readonly #context: Context; // its own, its tempo moved by tempo()
  #built: Built;

  constructor(
    engine: ChainEngine,
    { between, modules, context }: { between: ChainEnds; modules: Module[]; context: Context },
  ) {
    this.#engine = engine;
    this.#between = between;
    this.#modules = modules;
    this.#context = { ...context };
    this.#built = this.#build();
  }
  tempo(beat: number): void {
    this.#context.beat = beat;
    this.#run((plan, at) => plan.handle?.tempo?.(beat, at));
  }
  set(port: string, value: number, timeConstant = MOVE_GLIDE): void {
    this.#run((plan, at) => {
      if (!plan.ports[port]) {
        return null;
      }
      return plan.controls.set(port, value, at, timeConstant);
    });
  }
  // a port set at a time, at once, as a phrase's first note sets a tower's cutoff; the time in the context's
  setAt(port: string, value: number, at: number): void {
    this.#run((plan) => (plan.ports[port] ? plan.controls.set(port, value, at, 0) : null));
  }
  // a port set now, at once, as a param's value is set: as an emitter sets its track's as it's made
  setNow(port: string, value: number): void {
    this.#run(
      (plan) =>
        (plan.ports[port] ?? [])
          .filter((offered) => offered.param)
          .map((offered) => ({ id: offered.id, param: offered.param!, events: [['value', value]] })), // offering a param, as filtered
    );
  }
  // a port's param as it was built, for what shows it or records it: the first module's that offers it, or none
  paramOf(port: string): Automatable | undefined {
    const offered = this.#offering(port);
    if (!offered?.param) {
      return undefined;
    }
    return paramOf(offered.node, offered.param);
  }
  // the node offering a port as it was built, for what reads it (a limiter's points and readings): the first module's, or none
  nodeOf(port: string): BuiltNode | undefined {
    return this.#offering(port)?.node;
  }
  // The points a meter reads inside its modules, by name, as built: a limiter's in, after its
  // gain, and its out. None where no module's node offers one.
  points(): Readonly<Record<string, AudioNode>> {
    return Object.assign({}, ...this.#offered().map((node) => node.points)) as Record<string, AudioNode>;
  }
  // What its modules say of themselves, by name, each read as the chain is built now: what a
  // limiter takes away. None where no module's node offers one.
  readings(): Readonly<Record<string, () => number>> {
    const names = this.#offered().flatMap((node) => Object.keys(node.readings));
    return Object.fromEntries(names.map((name) => [name, () => this.#reading(name)]));
  }
  time(): number {
    const part = this.#line();
    if (!part) {
      return 0;
    }
    return time(delayOf(part).time, this.#values(part));
  }
  feedback(): number {
    const part = this.#line();
    if (!part) {
      return 0;
    }
    return val(delayOf(part).feedback, this.#values(part));
  }
  rebuild(): void {
    const old = this.#built;
    this.#built = this.#build();
    this.#between.input.disconnect(old.first);
    setTimeout(() => letGo(old), RING_OUT);
  }
  plans(): Plan[] {
    return this.#built.parts.map(({ plan }) => plan);
  }
  // each module planned and built, the last into its way out, each before it into the next
  #build(): Built {
    const now = this.#engine.now();
    const parts: Part[] = [];
    let into: AudioNode = this.#between.chainOut;
    for (const module of [...this.#modules].reverse()) {
      const plan = planOf(module, this.#context);
      const made = this.#engine.build(plan, now, into);
      parts.unshift({ module, plan, made });
      into = moduleInputOf(module, plan, made);
    }
    this.#between.input.connect(into);
    return { parts, first: into };
  }
  // what each module's plan is told now, run on its nodes
  #run(operationsFor: (plan: Plan, at: number) => Operation[] | null | undefined): void {
    const at = this.#engine.now();
    for (const { plan, made } of this.#built.parts) {
      const operations = operationsFor(plan, at);
      if (operations?.length) {
        this.#engine.apply(made, operations, 0);
      }
    }
  }
  // the first module's node that offers a port, and the param it offers there, if it's one
  #offering(port: string): { node: BuiltNode; param: string | undefined } | undefined {
    for (const { plan, made } of this.#built.parts) {
      const [offered] = plan.ports[port] ?? [];
      const node = offered && made[offered.id];
      if (node) {
        return { node, param: offered.param };
      }
    }
    return undefined;
  }
  // the nodes its modules built that offer points or readings, a module made of several's
  #offered(): Offering[] {
    return this.#built.parts.flatMap(({ made }) => made.filter(isOffering));
  }
  // a reading by name, from the chain as built now; 0 where none offers it any more
  #reading(name: string): number {
    const node = this.#offered().find((offering) => name in offering.readings);
    return node?.readings[name]!() ?? 0; // offered, as found
  }
  // the first delay line
  #line(): Part | undefined {
    return this.#built.parts.find(({ module }) => module.patch.delay);
  }
  // the values a module's own refer to
  #values({ module }: Part): Values {
    return { ...module.patch.params, ...module.params?.(), ...this.#context };
  }
}
// whether a built node offers points and readings, as a module made of several does
function isOffering(node: BuiltNode): node is Offering {
  return 'points' in node && 'readings' in node;
}
function planOf(module: Module, context: Context): Plan {
  return planPatch(module.patch, {}, context, module.params?.() ?? {});
}
function delayOf(part: Part) {
  return part.module.patch.delay as Delay; // a module's delay line, as written
}
// where a module's sound comes in: the node its plan names its input
function moduleInputOf(module: Module, plan: Plan, made: BuiltNode[]): AudioNode {
  const input = made[plan.input!];
  if (!input) {
    throw new Error(`an FX module with no input: ${module.name}`);
  }
  return inputOf(input); // a node made of several, a limiter, comes in at its own input
}
// an old chain, once it has rung out: its LFOs stopped, every node let go
function letGo({ parts }: Built): void {
  for (const { plan, made } of parts) {
    made.forEach((node, id) => {
      if (plan.nodes[id]?.starts.length) {
        try {
          sourceOf(node).stop!();
        } catch {}
      } // its LFOs
      outputOf(node).disconnect();
    });
  }
}

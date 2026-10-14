// ---------- libs/web-audio-fx: FX modules, chained between two points: an FX channel's, a strip's inserts, the master's ----------
// An FX module is a patch (libs/synth/, effect: true) with an input and an output: a delay line, a reverb, an insert. new FxChain() plans
// a chain of them and builds it between two points (between): where it starts (input) and its way out (chainOut), an FX channel of the
// mixer's between its input and its inserts, or its level, or any other two, in order, each into the next.
// modules: [{ name, patch, params }], params a function, read each time the chain is built, so a setting bound to one is read as it is
// then. context: a module's, a beat's length and random(); it plays no note. tempo(beat) glides what follows the beat (a delay line's time);
// set(port, value, timing) sets a port of every module that has it (a delay's feedback), now, at a time or gliding (timing.ts);
// valueOf(port) a port's value as its module plans it now (a delay line's time, 'delay.time', and feedback). rebuild() plans and builds
// the chain again, from its patches as they are now (an editor changed one): the new chain is built beside the old, where it starts moves over to it, and the old one rings out (RING_OUT) before it's let go, so its repeats aren't
// cut off. plans() for an editor's flow; points() and readings() what its modules offer to read. Times start at the context's now.
// As they play: the FX modules (modules.ts, FxModules), and a device's params (device-params.ts, DeviceParams).
import { plan as planPatch, portValue, type Context, type Params, type Patch, type Plan } from '../synth/index.ts';
import { paramOf, type Automatable, type BuiltNode } from '../web-audio-engine/index.ts';
import { BuiltModule, type ModuleEngine } from './module.ts';
import { MOVED, type Settable, type Timing } from './timing.ts';
export { DEVICES, FILTER, GAIN, LIMITER, LIMITER_SETTINGS, PAN, PAN_POT, UTILITY } from './inserts.ts';
export { BuiltModule, type ModuleEngine } from './module.ts';
export { MOVED, type Settable, type Target, type Timing } from './timing.ts';
export { FxModules } from './modules.ts';
export { DeviceParams } from './device-params.ts';
export { TEMPO_TIME } from './tempo.ts';
export type { Device, DeviceKind, DeviceName, LimiterSettings } from './inserts.ts';

// a module in a chain: its name, its patch, and its params, read each time the chain is built
export interface Module {
  name: string;
  patch: Patch;
  params?: () => Params; // its device's parameters, as they are now
}
// a module as built in the chain: the module, and what's built of it
interface Part {
  module: Module;
  built: BuiltModule;
}
// the chain as built: its parts, in order, and its first node, where it starts goes in
interface Built {
  parts: Part[];
  first: AudioNode;
}
// the two points a chain is built between: where it starts, and its way out (an FX channel is one)
interface ChainEnds {
  readonly input: AudioNode;
  readonly chainOut: AudioNode;
}

export const RING_OUT = 8000; // ms an old chain rings out after a rebuild before it's let go

export class FxChain implements Settable {
  readonly #engine: ModuleEngine;
  readonly #between: ChainEnds;
  readonly #modules: Module[];
  readonly #context: Context; // its own, its tempo moved by tempo()
  #built: Built;

  constructor(
    engine: ModuleEngine,
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
    const now = this.#engine.now();
    for (const { built } of this.#built.parts) {
      built.apply(built.plan.handle?.tempo?.(beat, now));
    }
  }
  // a port of every module that has it set by a timing: now, as a track's controllers set it as it's made; at a time, as a phrase's
  // first note sets a tower's cutoff; or gliding, as a control moved by hand; times the context's
  set(port: string, value: number, timing: Timing = MOVED): void {
    for (const { built } of this.#built.parts) {
      built.set(port, value, timing);
    }
  }
  // a port's value as its module plans it now, at its params and the tempo as they are: the first module's that offers it, or none. A
  // delay line's time and feedback, as a sung phrase's echoes are drawn
  valueOf(port: string): number | undefined {
    const part = this.#built.parts.find(({ built }) => built.plan.ports[port]);
    if (!part) {
      return undefined;
    }
    return portValue(planOf(part.module, this.#context), port);
  }
  // A param by its name as the chain plays it, one with a port or none (a Filter's resonance):
  // its module's params now over its patch's. The first module's that has it, or none.
  paramValue(name: string): unknown {
    for (const { module } of this.#built.parts) {
      const value = { ...module.patch.params, ...module.params?.() }[name];
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
  // a port's param as it was built, for what shows it or records it: the first module's that offers it, or none
  paramOf(port: string): Automatable | undefined {
    const offering = this.#offering(port);
    if (!offering?.param) {
      return undefined;
    }
    return paramOf(offering.node, offering.param);
  }
  // the node offering a port as it was built, for what reads it (a limiter's points and readings): the first module's, or none
  nodeOf(port: string): BuiltNode | undefined {
    return this.#offering(port)?.node;
  }
  // The points a meter reads inside its modules, by name, as built: a limiter's in, after its
  // gain, and its out. None where no module's node offers one.
  points(): Readonly<Record<string, AudioNode>> {
    return Object.assign({}, ...this.#nodes().map((node) => node.points)) as Record<string, AudioNode>;
  }
  // What its modules say of themselves, by name, each read as the chain is built now: what a
  // limiter takes away. None where no module's node offers one.
  readings(): Readonly<Record<string, () => number>> {
    const names = this.#nodes().flatMap((node) => Object.keys(node.readings));
    return Object.fromEntries(names.map((name) => [name, () => this.#reading(name)]));
  }
  rebuild(): void {
    const old = this.#built;
    this.#built = this.#build();
    this.#between.input.disconnect(old.first);
    setTimeout(() => letGo(old), RING_OUT);
  }
  plans(): Plan[] {
    return this.#built.parts.map(({ built }) => built.plan);
  }
  // each module planned and built in its context, the last into its way out, each before it into the next
  #build(): Built {
    const parts: Part[] = [];
    let into: AudioNode = this.#between.chainOut;
    for (const module of [...this.#modules].reverse()) {
      const built = new BuiltModule(this.#engine, {
        patch: module.patch,
        params: module.params?.() ?? {},
        into,
        context: this.#context,
      });
      parts.unshift({ module, built });
      into = built.input;
    }
    this.#between.input.connect(into);
    return { parts, first: into };
  }
  // the first module's node that offers a port, and the param it offers there, if it's one
  #offering(port: string): { node: BuiltNode; param: string | undefined } | undefined {
    for (const { built } of this.#built.parts) {
      const offering = built.offering(port);
      if (offering) {
        return offering;
      }
    }
    return undefined;
  }
  // the nodes its modules built, as built now
  #nodes(): BuiltNode[] {
    return this.#built.parts.flatMap(({ built }) => built.nodes);
  }
  // a reading by name, from the chain as built now; 0 where none offers it any more
  #reading(name: string): number {
    const node = this.#nodes().find((offering) => name in offering.readings);
    return node?.readings[name]!() ?? 0; // offered, as found
  }
}
// a module planned in a context, at its params now
function planOf(module: Module, context: Context): Plan {
  return planPatch(module.patch, {}, context, module.params?.() ?? {});
}
// an old chain, once it has rung out: its LFOs stopped, every node let go
function letGo({ parts }: Built): void {
  for (const { built } of parts) {
    built.letGo();
  }
}

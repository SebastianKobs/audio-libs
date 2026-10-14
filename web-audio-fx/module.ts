// ---------- libs/web-audio-fx/module: one module built into where its sound goes: a strip's gain or pan, an FX chain's part ----------
import { NO_DRAWS, plan as planPatch, type Context, type Params, type Patch, type Plan } from '../synth/index.ts';
import type { Automation, Operation } from '../audio-plan/index.ts';
import { inputOf, outputOf, paramOf, sourceOf, type BuiltNode, type Engine } from '../web-audio-engine/index.ts';
import { MOVED, portSet, type Settable, type Timing } from './timing.ts';

// the engine a module is built by
export type ModuleEngine = Pick<Engine, 'now' | 'build' | 'apply'>;
// the node a port is offered by, and its param, where it's one
interface Offering {
  node: BuiltNode;
  param: string | undefined;
}

// A module built at its params, into where its sound goes (into), as the mixer's stages are (F5) and an FX chain's parts; with none, its
// caller wires its way out (an FX channel's input, before its chain). Planned in a context, one that draws nothing unless it's given one
// (an FX chain's, with its beat).
// Its way in (input) and out (output), each a node of the engine's; its plan and the nodes built of it.
// A port set by a timing (set()), so it's a stage set from outside (a track's controllers), a port it hasn't left alone; given events of
// its own (automate()) or a plan's operations (apply()); times the context's. Its value now read back (value()).
export class BuiltModule implements Settable {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly plan: Plan;
  readonly nodes: BuiltNode[];
  readonly #engine: ModuleEngine;

  constructor(
    engine: ModuleEngine,
    {
      patch,
      params = {},
      into,
      context = NO_DRAWS,
    }: { patch: Patch; params?: Params; into?: AudioNode; context?: Context },
  ) {
    this.#engine = engine;
    this.plan = planPatch(patch, {}, context, params);
    this.nodes = engine.build(this.plan, engine.now(), into);
    const input = this.plan.input;
    if (input === undefined || input === null) {
      throw new Error('a module with no input');
    }
    this.input = inputOf(this.#node(input)); // a node made of several, a limiter, comes in at its own input
    this.output = outputOf(this.#node(this.plan.edges.find(([, to]) => to === 'out')![0])); // an effect's plan goes out
  }
  // a port set by a timing, gliding from a time to come where it's given one, a context time (V3); one it lacks left alone
  set(port: string, value: number, timing: Timing = MOVED): void {
    this.apply(portSet(this.plan, port, value, timing, this.#engine.now()));
  }
  // its plan's operations run on its nodes: a tempo followed, a port set
  apply(operations: readonly Operation[] | null | undefined): void {
    if (operations?.length) {
      this.#engine.apply(this.nodes, [...operations], 0);
    }
  }
  automate(port: string, events: Automation[]): void {
    this.apply(this.#offered(port).map((offered) => ({ id: offered.id, param: offered.param!, events })));
  }
  // a port's value now, as Web Audio has it: its first param's
  value(port: string): number {
    const offered = this.#offered(port)[0];
    if (!offered) {
      throw new Error(`no port ${port} on this module`);
    }
    return paramOf(this.#node(offered.id), offered.param!).value;
  }
  // the node offering a port, and its param where it's one, for what reads it (a limiter's points); none where it offers no such port
  offering(port: string): Offering | undefined {
    const [offered] = this.plan.ports[port] ?? [];
    const node = offered && this.nodes[offered.id];
    if (!node) {
      return undefined;
    }
    return { node, param: offered.param };
  }
  // let go of, once nothing plays into it: its sources stopped (an LFO's), each of its nodes' way out disconnected
  letGo(): void {
    this.nodes.forEach((node, id) => {
      if (this.plan.nodes[id]?.starts.length) {
        try {
          sourceOf(node).stop!();
        } catch {}
      }
      outputOf(node).disconnect();
    });
  }
  // the params a port offers, a node's input left out
  #offered(port: string): { id: number; param?: string | undefined }[] {
    return (this.plan.ports[port] ?? []).filter((offered) => offered.param);
  }
  #node(id: number): BuiltNode {
    return this.nodes[id]!; // a node its plan made
  }
}

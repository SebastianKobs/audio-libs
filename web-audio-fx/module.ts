// ---------- libs/web-audio-fx/module: one module built on its own, into where its sound goes: a strip's gain or pan, the mixer's sum and master ----------
import { plan as planPatch, type Patch, type Plan, type Context, type Params } from '../synth/index.ts';
import type { Automation } from '../audio-plan/index.ts';
import { inputOf, outputOf, paramOf, type BuiltNode, type Engine } from '../web-audio-engine/index.ts';
import { MOVED, portSet, type Settable, type Timing } from './timing.ts';

type ModuleEngine = Pick<Engine, 'now' | 'build' | 'apply'>;

const CONTEXT: Context = { random: () => 0.5 }; // a gain or a pan reads no tempo and draws nothing

// a module built on its own, at its params, into where its sound goes (into), as the mixer's stages are (F5); with none, its caller wires
// its way out (an FX channel's input, before its chain). Its way in (input) and out (output), each a node of the engine's; a port set
// by a timing (set()), as an FX chain's, so it's a stage set from outside (a track's controllers), a port it hasn't left alone; or given
// events of its own (automate()); times the context's. Its value now read back (value())
export class BuiltModule implements Settable {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly #engine: ModuleEngine;
  readonly #plan: Plan;
  readonly #nodes: BuiltNode[];

  constructor(engine: ModuleEngine, { patch, params = {}, into }: { patch: Patch; params?: Params; into?: AudioNode }) {
    this.#engine = engine;
    this.#plan = planPatch(patch, {}, CONTEXT, params);
    this.#nodes = engine.build(this.#plan, engine.now(), into);
    this.input = inputOf(this.#node(this.#plan.input!)); // an effect module's plan names its input
    this.output = outputOf(this.#node(this.#plan.edges.find(([, to]) => to === 'out')![0])); // and goes out
  }
  // a port set by a timing, gliding from a time to come where it's given one, a context time (V3); one it lacks left alone
  set(port: string, value: number, timing: Timing = MOVED): void {
    this.#engine.apply(this.#nodes, portSet(this.#plan, port, value, timing, this.#engine.now()), 0);
  }
  automate(port: string, events: Automation[]): void {
    const operations = this.#offered(port).map((offered) => ({ id: offered.id, param: offered.param!, events }));
    this.#engine.apply(this.#nodes, operations, 0);
  }
  // a port's value now, as Web Audio has it: its first param's
  value(port: string): number {
    const offered = this.#offered(port)[0];
    if (!offered) {
      throw new Error(`no port ${port} on this module`);
    }
    return paramOf(this.#node(offered.id), offered.param!).value;
  }
  // let go of, once nothing plays into it: each of its nodes' way out disconnected
  letGo(): void {
    for (const node of this.#nodes) {
      outputOf(node).disconnect();
    }
  }
  // the params a port offers, a node's input left out
  #offered(port: string): { id: number; param?: string | undefined }[] {
    return (this.#plan.ports[port] ?? []).filter((offered) => offered.param);
  }
  #node(id: number): BuiltNode {
    return this.#nodes[id]!; // a node its plan made
  }
}

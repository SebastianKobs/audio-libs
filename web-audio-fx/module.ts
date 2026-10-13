// ---------- libs/web-audio-fx/module: one module built on its own, into where its sound goes: a strip's gain or pan, the mixer's sum and master ----------
import { plan as planPatch, type Patch, type Plan, type Context, type Params } from '../synth/index.ts';
import type { Automation } from '../audio-plan/index.ts';
import { inputOf, outputOf, paramOf, type BuiltNode, type Engine } from '../web-audio-engine/index.ts';

type ModuleEngine = Pick<Engine, 'now' | 'build' | 'apply'>;

const CONTEXT: Context = { random: () => 0.5 }; // a gain or a pan reads no tempo and draws nothing
export const MOVE_GLIDE = 0.05; // s: the time constant a port moved with none of its own glides there by, a control moved by hand's (G3c3)

// a module built on its own, at its params, into where its sound goes (into), as the mixer's stages are (F5); with none, its caller wires
// its way out (an FX channel's input, before its chain). Its way in (input) and out (output), each a node of the engine's; a port glided
// there through its plan's controls (set()), set at a time (setAt()) or now (setNow()), as an FX chain's, so it's a stage an emitter sets
// (sound/space/emitter.ts, F6b), a port it hasn't left alone; or given events of its own (automate()); times the context's. Its value
// now read back (value())
export class BuiltModule {
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
  set(port: string, value: number, timeConstant = MOVE_GLIDE): void {
    this.#move(port, value, this.#engine.now(), timeConstant);
  }
  setAt(port: string, value: number, at: number): void {
    this.#move(port, value, at, 0);
  }
  setNow(port: string, value: number): void {
    this.automate(port, [['value', value]]);
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
  // a port moved through its plan's controls, from at: gliding by its time constant, or at once with none; a port it lacks left alone
  #move(port: string, value: number, at: number, timeConstant: number): void {
    if (!this.#plan.ports[port]) {
      return;
    }
    this.#engine.apply(this.#nodes, this.#plan.controls.set(port, value, at, timeConstant), 0);
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

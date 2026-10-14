// ---------- libs/web-audio-mixer/device-insert: a device on an insert slot ----------
// As a desk's insert slot holds a device: one FX module (libs/web-audio-fx/) in a chain,
// between a way in and a way out of its own, unity Gain modules the engine builds.
// The strip it's put on wires those. The module reads its params each time it's built,
// and is set through its chain, rebuilt live as its patch changes.
import { BuiltModule, FxChain, GAIN } from '../web-audio-fx/index.ts';
import type { Params, Patch } from '../synth/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import type { Insert } from './strip.ts';

// A device on an insert slot: its name, its FX module, its params, and a beat's length for
// params in note values. Returns its chain, to set it through, and the insert a strip takes.
export function deviceInsert(
  engine: Engine,
  { name, patch, params, beat }: { name: string; patch: Patch; params: () => Params; beat: number },
): { chain: FxChain; insert: Insert } {
  const between = { input: unityGain(engine), chainOut: unityGain(engine) };
  const chain = new FxChain(engine, {
    between,
    modules: [{ name, patch, params }],
    context: { beat, random: Math.random },
  });
  return { chain, insert: { name, input: between.input, output: between.chainOut } };
}

// A Gain module at unity; its way out is the caller's to wire.
function unityGain(engine: Engine): AudioNode {
  return new BuiltModule(engine, { patch: GAIN }).input;
}

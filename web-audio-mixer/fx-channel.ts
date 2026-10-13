// ---------- libs/web-audio-mixer/fx-channel: an FX channel, its input, its chain of FX modules, its inserts, level, pan, sends and way out ----------
import type { Desk, MixerEngine } from './mixer.ts';
import type { Insert } from './channel.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MUTE } from './gains.ts';

// an FX channel's stages, each a module the engine built: its input, its level, its pan where it has one, its output
interface Stages {
  input: BuiltModule;
  level: BuiltModule;
  pan: BuiltModule | null;
  output: BuiltModule;
}
export interface FxOptions {
  level?: number | undefined;
  pan?: number | undefined;
  sends?: Record<string, number> | undefined;
  out?: string | undefined;
  inserts?: Insert[] | undefined;
}
// an FX channel, stereo: an input, where sends arrive; a chain of FX modules (libs/web-audio-fx/), built between its input and chainOut: its
// inserts, as a channel's but after the chain, in order, into its level, or else its level; its level; a pan, if it has one; its
// output, its mute, at 1, after its pan: its sends to other FX channels and its way out after it, so they keep its panning and its own
// tail goes quiet too. Its input, level, output and sends each a Gain module, its pan a Pan module, built by the engine (F5d), set through
// them; its nodes theirs; its sends handed out as stages (sendStages, F6b), as a channel's
export class FxChannel {
  readonly input: GainNode;
  readonly inserts: Insert[];
  readonly level: GainNode;
  readonly chainOut: AudioNode; // where its chain goes: its first insert, each into the next, the last into its level
  readonly pan: StereoPannerNode | null;
  readonly output: GainNode;
  readonly tail: GainNode;
  readonly sends: Record<string, GainNode> = {};
  readonly sendStages: Record<string, BuiltModule> = {};
  readonly #engine: MixerEngine;
  readonly #stages: Stages;

  constructor(
    engine: MixerEngine,
    desk: Desk,
    { level = 1, pan, sends = {}, out = 'master', inserts = [] }: FxOptions,
  ) {
    this.#engine = engine;
    this.inserts = inserts;
    const stages = (this.#stages = this.#build(desk.outOf(out), { level, pan }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.level = stages.level.input as GainNode;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.output = stages.output.input as GainNode;
    this.tail = this.output;
    this.chainOut = this.#chainInserts();
    for (const [to, amount] of Object.entries(sends)) {
      const sendStage = new BuiltModule(engine, { patch: GAIN, params: { level: amount }, into: desk.fxInput(to) });
      this.output.connect(sendStage.input);
      this.sendStages[to] = sendStage;
      this.sends[to] = sendStage.input as GainNode; // a Gain module's one gain
    }
  }
  // its stages, each a module the engine builds into where its sound goes: its output into its way out; its pan, where it has one and the
  // context can pan, into its output; its level into its pan, or its output; its input into nothing yet, its chain built after it
  #build(wayOut: AudioNode, { level, pan }: { level: number; pan: number | undefined }): Stages {
    const engine = this.#engine;
    const output = new BuiltModule(engine, { patch: GAIN, into: wayOut });
    const panStage =
      pan !== undefined && engine.canPan() ?
        new BuiltModule(engine, { patch: PAN, params: { pan }, into: output.input })
      : null; // none where it can't
    const levelStage = new BuiltModule(engine, {
      patch: GAIN,
      params: { level },
      into: panStage?.input ?? output.input,
    });
    const input = new BuiltModule(engine, { patch: GAIN });
    return { input, level: levelStage, pan: panStage, output };
  }
  // its inserts after its chain, in order, the last into its level. Returns where its chain goes: its first insert, or its level
  #chainInserts(): AudioNode {
    let chainOut: AudioNode = this.level;
    for (const insert of [...this.inserts].reverse()) {
      insert.output.connect(chainOut);
      chainOut = insert.input;
    }
    return chainOut;
  }
  volume(value: number): void {
    this.#stages.level.set('gain.gain', value);
  }
  muted(muting: boolean): void {
    this.#stages.output.set('gain.gain', muting ? 0 : 1, MUTE);
  }
  panTo(position: number): void {
    this.#stages.pan?.set('pan.pan', position);
  }
  sendTo(to: string, amount: number): void {
    this.sendStages[to]?.set('gain.gain', amount);
  }
}

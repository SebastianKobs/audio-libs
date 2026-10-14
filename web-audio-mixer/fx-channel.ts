// ---------- libs/web-audio-mixer/fx-channel: an FX channel, a return ----------
import type { Desk, MixerEngine } from './mixer.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MASTER } from '../mixer/index.ts';
import { ChannelStrip, chained, type StripOptions } from './strip.ts';

// An FX channel's stages, each a module the engine built.
interface Stages {
  input: BuiltModule;
  level: BuiltModule;
  pan: BuiltModule | null;
  output: BuiltModule;
}

// An FX channel, stereo, fed by sends.
// Signal:
//   1. its input, where sends arrive;
//   2. a chain of FX modules (libs/web-audio-fx/), built between its input and chainOut;
//   3. its inserts, as a channel's but after the chain, in order;
//   4. its level, then its pan if it has one;
//   5. its output, its mute, at 1: its sends and its way out after it, so they keep its
//      panning and its own tail goes quiet when muted.
// Sends: only to returns built before it (returns), so there are no loops, from its output, or
// as a channel's from 'pre', after its inserts. Those its setup gives are built as it's made;
// the others once first turned up.
// Stages: input, level, output and sends are Gain modules, the pan a Pan module, built by
// the engine; its sends handed out as stages (sendStages), as a channel's.
export class FxChannel extends ChannelStrip {
  readonly input: GainNode;
  readonly level: GainNode;
  readonly chainOut: AudioNode; // where its chain goes: its first insert, or its level
  readonly pan: StereoPannerNode | null;
  readonly output: GainNode;
  readonly tail: GainNode;
  readonly #stages: Stages;

  constructor(
    engine: MixerEngine,
    desk: Desk,
    name: string,
    { volume = 1, pan, sends = [], out = MASTER, inserts = [] }: StripOptions,
  ) {
    super(engine, desk, name, inserts);
    const stages = (this.#stages = this.#build(desk.outOf(out), { level: volume, pan }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.level = stages.level.input as GainNode;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.output = stages.output.input as GainNode;
    this.tail = this.output;
    this.chainOut = this.#chainInserts();
    this.connectSends(sends, this.level);
  }
  get volumeStage(): BuiltModule {
    return this.#stages.level;
  }
  get panStage(): BuiltModule | null {
    return this.#stages.pan;
  }
  // muted at its output, so its own tail goes quiet too
  protected get muteStage(): BuiltModule {
    return this.#stages.output;
  }
  // Its stages, each built into where its sound goes, from the way out back:
  //   1. its output, into its way out;
  //   2. its pan, where it has one and the context can pan, into its output;
  //   3. its level, into its pan or its output;
  //   4. its input, into nothing yet: its chain is built after it.
  #build(wayOut: AudioNode, { level, pan }: { level: number; pan: number | undefined }): Stages {
    const engine = this.engine;
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
  // Its inserts after its chain, in order, the last into its level.
  // Returns where its chain goes: its first insert, or its level.
  #chainInserts(): AudioNode {
    chained(this.inserts);
    this.inserts.at(-1)?.output.connect(this.level);
    return this.inserts[0]?.input ?? this.level;
  }
}

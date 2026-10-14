// ---------- libs/web-audio-mixer/fx-channel: an FX channel, a return ----------
import type { Desk, MixerEngine } from './mixer.ts';
import type { Insert } from './channel.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MUTE } from './gains.ts';

// An FX channel's stages, each a module the engine built.
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

// An FX channel, stereo, fed by sends.
// Signal:
//   1. its input, where sends arrive;
//   2. a chain of FX modules (libs/web-audio-fx/), built between its input and chainOut;
//   3. its inserts, as a channel's but after the chain, in order;
//   4. its level, then its pan if it has one;
//   5. its output, its mute, at 1: its sends and its way out after it, so they keep its
//      panning and its own tail goes quiet when muted.
// Sends: only to returns built before it (returns), so there are no loops. Those its setup
// gives are built as it's made; the others once first turned up.
// Stages: input, level, output and sends are Gain modules, the pan a Pan module, built by
// the engine; its sends handed out as stages (sendStages), as a channel's.
export class FxChannel {
  readonly input: GainNode;
  readonly inserts: Insert[];
  readonly level: GainNode;
  readonly chainOut: AudioNode; // where its chain goes: its first insert, or its level
  readonly pan: StereoPannerNode | null;
  readonly output: GainNode;
  readonly tail: GainNode;
  readonly returns: readonly string[]; // the returns built before it
  readonly sends: Record<string, GainNode> = {};
  readonly sendStages: Record<string, BuiltModule> = {};
  readonly #engine: MixerEngine;
  readonly #desk: Desk;
  readonly #name: string;
  readonly #stages: Stages;

  constructor(
    engine: MixerEngine,
    desk: Desk,
    name: string,
    { level = 1, pan, sends = {}, out = 'master', inserts = [] }: FxOptions,
  ) {
    this.#engine = engine;
    this.#desk = desk;
    this.#name = name;
    this.inserts = inserts;
    this.returns = desk.returns();
    const stages = (this.#stages = this.#build(desk.outOf(out), { level, pan }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.level = stages.level.input as GainNode;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.output = stages.output.input as GainNode;
    this.tail = this.output;
    this.chainOut = this.#chainInserts();
    for (const [to, amount] of Object.entries(sends)) {
      this.#addSend(to, amount);
    }
  }
  // Its stages, each built into where its sound goes, from the way out back:
  //   1. its output, into its way out;
  //   2. its pan, where it has one and the context can pan, into its output;
  //   3. its level, into its pan or its output;
  //   4. its input, into nothing yet: its chain is built after it.
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
  // Its inserts after its chain, in order, the last into its level.
  // Returns where its chain goes: its first insert, or its level.
  #chainInserts(): AudioNode {
    let chainOut: AudioNode = this.level;
    for (const insert of [...this.inserts].reverse()) {
      insert.output.connect(chainOut);
      chainOut = insert.input;
    }
    return chainOut;
  }
  // A send's gain, from its output into its return, at its level.
  #addSend(to: string, level: number): BuiltModule {
    const sendStage = new BuiltModule(this.#engine, { patch: GAIN, params: { level }, into: this.#desk.fxInput(to) });
    this.output.connect(sendStage.input);
    this.sendStages[to] = sendStage;
    this.sends[to] = sendStage.input as GainNode; // a Gain module's one gain
    return sendStage;
  }
  // Its volume, its level, and its pan as stages, for a parameter's target (target.ts); no pan where it has none.
  get volumeStage(): BuiltModule {
    return this.#stages.level;
  }
  get panStage(): BuiltModule | null {
    return this.#stages.pan;
  }
  volume(value: number): void {
    this.#stages.level.set('gain.gain', value);
  }
  // Muted at its output, so its own tail goes quiet too.
  muted(muting: boolean): void {
    this.#stages.output.set('gain.gain', muting ? 0 : 1, MUTE);
  }
  panTo(position: number): void {
    this.#stages.pan?.set('pan.pan', position);
  }
  // A send turned up or down, gliding there. A return built before it that its setup
  // doesn't give gets its send when first turned up: from 0, routed then.
  sendTo(to: string, amount: number): void {
    const sendStage = this.sendStages[to] ?? this.#turnedUp(to, amount);
    sendStage?.set('gain.gain', amount);
  }
  #turnedUp(to: string, amount: number): BuiltModule | null {
    if (amount <= 0 || !this.returns.includes(to)) {
      return null;
    }
    this.#desk.sendAdded(this.#name, to);
    return this.#addSend(to, 0);
  }
  // A control by its name, as a desk's remote control has them: its level, its pan, or a
  // send by its return's name.
  set(control: string, value: number): void {
    setByName(this, control, value);
  }
}
// A strip's control by its name, a channel's or an FX channel's:
// 'volume' its fader or level, 'pan' its pan, anything else a send by its return's name.
export function setByName(strip: Pick<FxChannel, 'volume' | 'panTo' | 'sendTo'>, control: string, value: number): void {
  if (control === 'volume') {
    strip.volume(value);
    return;
  }
  if (control === 'pan') {
    strip.panTo(value);
    return;
  }
  strip.sendTo(control, value);
}

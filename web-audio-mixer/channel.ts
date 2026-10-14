// ---------- libs/web-audio-mixer/channel: a channel or a bus ----------
import type { Desk, MixerEngine } from './mixer.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MASTER } from '../mixer/index.ts';
import { ChannelStrip, chained, type Insert, type StripOptions } from './strip.ts';

// What a strip's stages are built from: its options, given or their defaults.
interface StageOptions {
  volume: number;
  pan: number | undefined;
  out: string;
  inserts: Insert[];
}
// A strip's stages, each a module the engine built.
interface Stages {
  input: BuiltModule;
  fader: BuiltModule;
  pan: BuiltModule | null;
}

// A channel or a bus. A bus is a channel whose input takes what's routed into it.
// Signal: its input (its mute), each insert in order, its fader, its pan if it has one,
// then its way out. Without inserts, the input goes straight into the fader.
// Sends: one to every return on the desk, as Ableton's (returns). Those the setup lists
// are built as it's made; the others once first turned up, after the fader and the pan.
// Stages: input, fader and sends are Gain modules, the pan a Pan module, built by the engine.
// The fader and the sends are handed out as stages (faderStage, sendStages), for what sets
// them from outside, at their port 'gain.gain': a track's controllers.
export class Channel extends ChannelStrip {
  readonly input: GainNode; // where the sound comes in, its mute, at 1 (muted())
  readonly fader: GainNode;
  readonly pan: StereoPannerNode | null;
  readonly faderStage: BuiltModule;
  readonly tail: AudioNode;
  readonly #stages: Stages;

  constructor(
    engine: MixerEngine,
    desk: Desk,
    name: string,
    { volume = 1, pan, sends = [], out = MASTER, inserts = [] }: StripOptions,
  ) {
    super(engine, desk, name, inserts);
    const stages = (this.#stages = this.#build(desk, { volume, pan, out, inserts }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.fader = stages.fader.input as GainNode;
    this.faderStage = stages.fader;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.tail = (stages.pan ?? stages.fader).output;
    this.connectSends(sends, this.#chainInserts());
  }
  get volumeStage(): BuiltModule {
    return this.#stages.fader;
  }
  get panStage(): BuiltModule | null {
    return this.#stages.pan;
  }
  // muted at its input, so its sends go quiet too
  protected get muteStage(): BuiltModule {
    return this.#stages.input;
  }
  // Its stages, each built into where its sound goes, from the way out back:
  //   1. its pan, where it has one and the context can pan, into its way out;
  //   2. its fader, into its pan or its way out;
  //   3. its input, into its first insert or its fader.
  #build(desk: Desk, { volume, pan, out, inserts }: StageOptions): Stages {
    const panStage = pan !== undefined && this.engine.canPan() ? this.#stage(PAN, { pan }, desk.outOf(out)) : null; // none where it can't
    const fader = this.#stage(GAIN, { level: volume }, panStage?.input ?? desk.outOf(out));
    const input = this.#stage(GAIN, {}, inserts[0]?.input ?? fader.input);
    return { input, fader, pan: panStage };
  }
  // A stage of it: a module the engine builds at its params, into where its sound goes.
  #stage(patch: typeof GAIN, params: Record<string, number>, into: AudioNode): BuiltModule {
    return new BuiltModule(this.engine, { patch, params, into });
  }
  // Its input, already into its first insert or its fader, through each insert in order,
  // the last into its fader. Returns where a pre-fader send is taken: after the inserts.
  #chainInserts(): AudioNode {
    chained(this.inserts);
    const last = this.inserts.at(-1);
    if (!last) {
      return this.input;
    }
    last.output.connect(this.fader);
    return last.output;
  }
}

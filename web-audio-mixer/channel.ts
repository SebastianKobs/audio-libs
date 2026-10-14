// ---------- libs/web-audio-mixer/channel: a channel or a bus ----------
import type { Desk, MixerEngine } from './mixer.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MUTE } from './gains.ts';
import { setByName } from './fx-channel.ts';

// An insert on a strip: modules the caller built in the context, in at input, out at output.
// tap: where a send can be taken before the insert's level.
export interface Insert {
  name: string;
  input: AudioNode;
  output: AudioNode;
  tap?: AudioNode;
}
// A send, in a strip's setup:
//   - by an FX channel's name: at 1, after the fader and the pan, with no gain of its own;
//   - with an amount: a gain of its own, taken after the fader and the pan, before the
//     fader ('pre', after the inserts), or at an insert's tap (the insert's name).
export type Send = string | { to: string; amount?: number; from?: string };
type SendWithAmount = Exclude<Send, string>;
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
// An option given as undefined is one not given: the caller's settings may have none yet.
export interface StripOptions {
  volume?: number | undefined;
  pan?: number | undefined;
  sends?: Send[] | undefined;
  out?: string | undefined;
  inserts?: Insert[] | undefined;
}

// A channel or a bus. A bus is a channel whose input takes what's routed into it.
// Signal: its input (its mute), each insert in order, its fader, its pan if it has one,
// then its way out. Without inserts, the input goes straight into the fader.
// Sends: one to every return on the desk, as Ableton's (returns). Those the setup lists
// are built as it's made; the others once first turned up, after the fader and the pan.
// Stages: input, fader and sends are Gain modules, the pan a Pan module, built by the engine.
// The fader and the sends are handed out as stages (faderStage, sendStages), for what sets
// them from outside, at their port 'gain.gain': a track's controllers.
export class Channel {
  readonly input: GainNode; // where the sound comes in, its mute, at 1 (muted())
  readonly inserts: Insert[];
  readonly fader: GainNode;
  readonly pan: StereoPannerNode | null;
  readonly returns: readonly string[]; // every return on the desk as it was made
  readonly sends: Record<string, GainNode> = {};
  readonly faderStage: BuiltModule;
  readonly sendStages: Record<string, BuiltModule> = {};
  readonly tail: AudioNode;
  readonly #engine: MixerEngine;
  readonly #desk: Desk;
  readonly #name: string;
  readonly #stages: Stages;
  readonly #listed = new Set<string>(); // the returns its setup sends to

  constructor(
    engine: MixerEngine,
    desk: Desk,
    name: string,
    { volume = 1, pan, sends = [], out = 'master', inserts = [] }: StripOptions,
  ) {
    this.#engine = engine;
    this.#desk = desk;
    this.#name = name;
    this.inserts = inserts;
    this.returns = desk.returns();
    const stages = (this.#stages = this.#build(desk, { volume, pan, out, inserts }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.fader = stages.fader.input as GainNode;
    this.faderStage = stages.fader;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.tail = (stages.pan ?? stages.fader).output;
    const preFader = this.#chainInserts();
    this.#connectSends(desk, sends, preFader);
  }
  // Its stages, each built into where its sound goes, from the way out back:
  //   1. its pan, where it has one and the context can pan, into its way out;
  //   2. its fader, into its pan or its way out;
  //   3. its input, into its first insert or its fader.
  #build(desk: Desk, { volume, pan, out, inserts }: StageOptions): Stages {
    const panStage = pan !== undefined && this.#engine.canPan() ? this.#stage(PAN, { pan }, desk.outOf(out)) : null; // none where it can't
    const fader = this.#stage(GAIN, { level: volume }, panStage?.input ?? desk.outOf(out));
    const input = this.#stage(GAIN, {}, inserts[0]?.input ?? fader.input);
    return { input, fader, pan: panStage };
  }
  // A stage of it: a module the engine builds at its params, into where its sound goes.
  #stage(patch: typeof GAIN, params: Record<string, number>, into: AudioNode): BuiltModule {
    return new BuiltModule(this.#engine, { patch, params, into });
  }
  // Its input, already into its first insert or its fader, through each insert in order,
  // the last into its fader. Returns where a pre-fader send is taken: after the inserts.
  #chainInserts(): AudioNode {
    let preFader: AudioNode = this.input;
    this.inserts.forEach((insert, index) => {
      if (index > 0) {
        preFader.connect(insert.input);
      }
      preFader = insert.output;
    });
    if (this.inserts.length) {
      preFader.connect(this.fader);
    }
    return preFader;
  }
  // The sends its setup lists. By name: at 1, after the fader and the pan.
  // With an amount: a gain of its own, from where it's taken.
  #connectSends(desk: Desk, sends: Send[], preFader: AudioNode): void {
    for (const send of sends) {
      if (typeof send === 'string') {
        this.#listed.add(send);
        this.tail.connect(desk.fxInput(send));
        continue;
      }
      this.#listed.add(send.to);
      const source = sendSource(send, { strip: this.#name, inserts: this.inserts, preFader, tail: this.tail });
      this.#addSend(send.to, source, send.amount ?? 1);
    }
  }
  // A send's gain, built from where it's taken into its return, at its level.
  #addSend(to: string, source: AudioNode, level: number): BuiltModule {
    const sendStage = this.#stage(GAIN, { level }, this.#desk.fxInput(to));
    source.connect(sendStage.input);
    this.sendStages[to] = sendStage;
    this.sends[to] = sendStage.input as GainNode; // a Gain module's one gain
    return sendStage;
  }
  // Its volume and its pan as stages, for a parameter's target (target.ts); no pan where it has none.
  get volumeStage(): BuiltModule {
    return this.#stages.fader;
  }
  get panStage(): BuiltModule | null {
    return this.#stages.pan;
  }
  volume(volume: number): void {
    this.#stages.fader.set('gain.gain', volume);
  }
  panTo(position: number): void {
    this.#stages.pan?.set('pan.pan', position);
  }
  // A send turned up or down, gliding there. A return its setup doesn't list gets its send
  // when first turned up: after the fader and the pan, from 0, routed then.
  sendTo(to: string, amount: number): void {
    const sendStage = this.sendStages[to] ?? this.#turnedUp(to, amount);
    sendStage?.set('gain.gain', amount);
  }
  #turnedUp(to: string, amount: number): BuiltModule | null {
    if (amount <= 0 || this.#listed.has(to) || !this.returns.includes(to)) {
      return null;
    }
    this.#desk.sendAdded(this.#name, to);
    return this.#addSend(to, this.tail, 0);
  }
  // Muted at its input, so its sends go quiet too.
  muted(muting: boolean): void {
    this.#stages.input.set('gain.gain', muting ? 0 : 1, MUTE);
  }
  // A control by its name, as a desk's remote control has them: its fader's volume, its pan,
  // or a send by its return's name.
  set(control: string, value: number): void {
    setByName(this, control, value);
  }
}
// What a strip sends to as it's made, for the routing: the FX channels its sends name.
export function sentTo(sends: Send[]): string[] {
  return sends.map((send) => (typeof send === 'string' ? send : send.to));
}
// Where a send with an amount is taken:
//   'pre': before the fader, after the inserts;
//   an insert's name: its tap, or its input;
//   none: after the fader and the pan.
function sendSource(
  send: SendWithAmount,
  { strip, inserts, preFader, tail }: { strip: string; inserts: Insert[]; preFader: AudioNode; tail: AudioNode },
): AudioNode {
  if (send.from === 'pre') {
    return preFader;
  }
  if (!send.from) {
    return tail;
  }
  const insert = inserts.find((candidate) => candidate.name === send.from);
  if (!insert) {
    throw new Error(`no insert ${send.from} on ${strip}`);
  }
  return insert.tap ?? insert.input;
}

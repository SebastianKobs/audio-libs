// ---------- libs/web-audio-mixer/strip: what a channel and an FX channel share ----------
import type { Desk, MixerEngine } from './mixer.ts';
import { BuiltModule, DEVICES, GAIN, MOVED, type Timing } from '../web-audio-fx/index.ts';
import { MUTE } from './gains.ts';

// An insert on a strip: modules the caller built in the context, in at input, out at output.
export interface Insert {
  name: string;
  input: AudioNode;
  output: AudioNode;
}
// A send, in a strip's setup:
//   - by a return's name: at 1, from its tail, with no gain of its own;
//   - with an amount: a gain of its own, taken from its tail, or before its volume ('pre',
//     after the inserts).
export type Send = string | { to: string; amount?: number; from?: 'pre' };
type SendWithAmount = Exclude<Send, string>;
// An option given as undefined is one not given: the caller's settings may have none yet.
export interface StripOptions {
  volume?: number | undefined;
  pan?: number | undefined;
  sends?: Send[] | undefined;
  out?: string | undefined;
  inserts?: Insert[] | undefined;
}

const LEVEL = DEVICES.gain.ports.level; // where a Gain's level is set: a volume's, a mute's, a send's

// A channel strip, as a console has one: a channel's or an FX channel's:
//   - its inserts, in order, and its sends, each to a return, a stage of its own (sendStages);
//   - its volume, its pan and its mute, each a stage, set at its port;
//   - a control set by its name (set()): 'volume', 'pan', or a send by its return's name,
//     by a timing, gliding there unless it says.
// A send to a return its setup doesn't give is built when first turned up, from its tail, from 0.
export abstract class ChannelStrip {
  readonly inserts: Insert[];
  readonly returns: readonly string[]; // every return it may send to, as it was made
  readonly sends: Record<string, GainNode> = {};
  readonly sendStages: Record<string, BuiltModule> = {};
  abstract readonly tail: AudioNode; // where its sends are taken from, and its way out
  protected readonly engine: MixerEngine;
  protected readonly desk: Desk;
  protected readonly name: string;
  readonly #listed = new Set<string>(); // the returns its setup sends to

  constructor(engine: MixerEngine, desk: Desk, name: string, inserts: Insert[]) {
    this.engine = engine;
    this.desk = desk;
    this.name = name;
    this.inserts = inserts;
    this.returns = desk.returns();
  }
  // its volume and its pan as stages, for a parameter's target (target.ts); no pan where it has none
  abstract get volumeStage(): BuiltModule;
  abstract get panStage(): BuiltModule | null;
  // where it's muted
  protected abstract get muteStage(): BuiltModule;

  volume(volume: number, timing: Timing = MOVED): void {
    this.volumeStage.set(LEVEL, volume, timing);
  }
  panTo(position: number, timing: Timing = MOVED): void {
    this.panStage?.set(DEVICES.pan.ports.pan, position, timing);
  }
  muted(muting: boolean): void {
    this.muteStage.set(LEVEL, muting ? 0 : 1, MUTE);
  }
  // A send turned up or down, gliding there; one to a return its setup doesn't give built as it's first turned up.
  // Returns whether it has one.
  sendTo(to: string, amount: number, timing: Timing = MOVED): boolean {
    const sendStage = this.sendStages[to] ?? this.#turnedUp(to, amount);
    sendStage?.set(LEVEL, amount, timing);
    return sendStage !== null && sendStage !== undefined;
  }
  // A control by its name, as a desk's remote control has them: its volume, its pan, or a send
  // by its return's name. Returns whether it has it: a strip with no pan, a mute, none.
  set(control: string, value: number, timing: Timing = MOVED): boolean {
    if (control === 'volume') {
      this.volume(value, timing);
      return true;
    }
    if (control === 'pan') {
      this.panTo(value, timing);
      return this.panStage !== null;
    }
    return this.sendTo(control, value, timing);
  }
  // The sends its setup gives. By name: at 1, from its tail. With an amount: a gain of its own,
  // from where it's taken; preFader is after its inserts, before its volume.
  protected connectSends(sends: readonly Send[], preFader: AudioNode): void {
    for (const send of sends) {
      if (typeof send === 'string') {
        this.#listed.add(send);
        this.tail.connect(this.desk.fxInput(send));
        continue;
      }
      this.#listed.add(send.to);
      const source = sendSource(send, { strip: this.name, preFader, tail: this.tail });
      this.#addSend(send.to, source, send.amount ?? 1);
    }
  }
  // A send's gain, built from where it's taken into its return, at its level.
  #addSend(to: string, source: AudioNode, level: number): BuiltModule {
    const sendStage = new BuiltModule(this.engine, { patch: GAIN, params: { level }, into: this.desk.fxInput(to) });
    source.connect(sendStage.input);
    this.sendStages[to] = sendStage;
    this.sends[to] = sendStage.input as GainNode; // a Gain module's one gain
    return sendStage;
  }
  #turnedUp(to: string, amount: number): BuiltModule | null {
    if (amount <= 0 || this.#listed.has(to) || !this.returns.includes(to)) {
      return null;
    }
    this.desk.sendAdded(this.name, to);
    return this.#addSend(to, this.tail, 0);
  }
}
// What a strip sends to as it's made, for the routing: the returns its sends name.
export function sentTo(sends: readonly Send[]): string[] {
  return sends.map((send) => (typeof send === 'string' ? send : send.to));
}
// a strip's inserts, each into the next
export function chained(inserts: readonly Insert[]): void {
  for (let index = 1; index < inserts.length; index++) {
    inserts[index - 1]!.output.connect(inserts[index]!.input);
  }
}
// Where a send with an amount is taken, as a console's:
//   'pre': before its volume, after the inserts;
//   none: its tail.
// Nowhere else: a send from JavaScript naming any other is refused.
function sendSource(
  send: SendWithAmount,
  { strip, preFader, tail }: { strip: string; preFader: AudioNode; tail: AudioNode },
): AudioNode {
  if (send.from === 'pre') {
    return preFader;
  }
  if (send.from !== undefined) {
    throw new Error(`a send is taken pre or post, not from ${String(send.from)}: ${strip}`);
  }
  return tail;
}

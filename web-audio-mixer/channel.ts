// ---------- libs/web-audio-mixer/channel: a channel or a bus, its inserts, fader, pan, sends and way out ----------
import type { Desk, MixerEngine } from './mixer.ts';
import { BuiltModule, GAIN, PAN } from '../web-audio-fx/index.ts';
import { MUTE } from './gains.ts';

// an insert on a strip: modules the caller built in the context, in at input, out at output; tap, where a send can be taken before its level
export interface Insert {
  name: string;
  input: AudioNode;
  output: AudioNode;
  tap?: AudioNode;
}
// a send: by an FX channel's name, at 1 after the fader and the pan; or with an amount, from after them, from before them ('pre'), or from
// an insert's tap (its name)
export type Send = string | { to: string; amount?: number; from?: string };
type SendWithAmount = Exclude<Send, string>;
// what a strip's stages are built from: its options, given or their defaults
interface StageOptions {
  volume: number;
  pan: number | undefined;
  room: string | null;
  roomAmount: number;
  out: string;
  inserts: Insert[];
}
// a strip's stages, each a module the engine built: its input, its fader, its pan and its room, where it has them
interface Stages {
  input: BuiltModule;
  fader: BuiltModule;
  pan: BuiltModule | null;
  room: BuiltModule | null;
}
// an option given as undefined is one not given: the caller's settings may have none yet
export interface StripOptions {
  volume?: number | undefined;
  pan?: number | undefined;
  sends?: Send[] | undefined;
  room?: string | null | undefined;
  roomAmount?: number | undefined;
  out?: string | undefined;
  inserts?: Insert[] | undefined;
}
// a channel or a bus: with inserts, an input that passes the sound on, through each insert in order (modules the caller built in the
// context: { name, input, output, tap }), into its fader; without, its input is its fader, as it always was. Then its pan, if it has one.
// A send by name goes at 1 from after the fader and the pan, with no gain of its own; one written { to, amount, from } has a gain, which
// sendTo() glides, from after the fader and the pan, from before them ('pre', after the inserts), so the fader sets only the dry sound, or
// from an insert's tap, before that insert's level, so a far sound's room can reach the reverb without its dry level. A bus is a
// channel whose input takes what's routed into it. Its input, fader, sends and room each a Gain module, its pan a Pan module, built by
// the engine (F5c), set through them; its nodes theirs. Its fader and its sends handed out as stages (faderStage, sendStages, F6b), for
// what sets them from outside, a replay track's notes and its emitter (sound/space/), at their port 'gain.gain'
export class Channel {
  readonly input: GainNode; // where the sound comes in, its mute, at 1 (muted())
  readonly inserts: Insert[];
  readonly fader: GainNode;
  readonly pan: StereoPannerNode | null;
  readonly room: GainNode | null; // its room: a send, its amount times the fader's level
  readonly sends: Record<string, GainNode> = {};
  readonly faderStage: BuiltModule;
  readonly sendStages: Record<string, BuiltModule> = {};
  readonly tail: AudioNode;
  readonly #engine: MixerEngine;
  readonly #stages: Stages;
  readonly #roomTo: string | null;
  #volume: number;
  #roomAmount: number;
  #muted = false;

  constructor(
    engine: MixerEngine,
    desk: Desk,
    name: string,
    { volume = 1, pan, sends = [], room = null, roomAmount = 1, out = 'master', inserts = [] }: StripOptions,
  ) {
    this.#engine = engine;
    this.inserts = inserts;
    this.#volume = volume;
    this.#roomAmount = roomAmount;
    this.#roomTo = room;
    const stages = (this.#stages = this.#build(desk, { volume, pan, room, roomAmount, out, inserts }));
    this.input = stages.input.input as GainNode; // a Gain module's one gain
    this.fader = stages.fader.input as GainNode;
    this.faderStage = stages.fader;
    this.pan = stages.pan ? (stages.pan.input as StereoPannerNode) : null; // a Pan module's one panner
    this.room = stages.room ? (stages.room.input as GainNode) : null; // its room: a send, its amount times the fader's level
    this.tail = (stages.pan ?? stages.fader).output;
    const preFader = this.#chainInserts();
    this.#connectSends(desk, name, sends, preFader);
  }
  // its stages, each a module the engine builds into where its sound goes: its pan, where it has one and the context can pan, into its
  // way out; its fader into its pan, or its way out; its input into its first insert, or its fader; its room into the FX channel it names
  #build(desk: Desk, { volume, pan, room, roomAmount, out, inserts }: StageOptions): Stages {
    const panStage = pan !== undefined && this.#engine.canPan() ? this.#stage(PAN, { pan }, desk.outOf(out)) : null; // none where it can't
    const fader = this.#stage(GAIN, { level: volume }, panStage?.input ?? desk.outOf(out));
    const input = this.#stage(GAIN, {}, inserts[0]?.input ?? fader.input);
    const roomStage = room ? this.#stage(GAIN, { level: volume * roomAmount }, desk.fxInput(room)) : null;
    return { input, fader, pan: panStage, room: roomStage };
  }
  // a stage of it, a module the engine builds at its params, into where its sound goes
  #stage(patch: typeof GAIN, params: Record<string, number>, into: AudioNode): BuiltModule {
    return new BuiltModule(this.#engine, { patch, params, into });
  }
  // its input, already into its first insert or its fader, through each insert in order, the last into its fader. Returns where a
  // pre-fader send is taken, after the inserts
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
  // each send: by name, at 1 from after the fader and the pan; with an amount, a gain of its own, from where it's taken
  #connectSends(desk: Desk, name: string, sends: Send[], preFader: AudioNode): void {
    for (const send of sends) {
      if (typeof send === 'string') {
        this.tail.connect(desk.fxInput(send));
        continue;
      }
      const source = sendSource(send, { strip: name, inserts: this.inserts, preFader, tail: this.tail });
      const sendStage = this.#stage(GAIN, { level: send.amount ?? 1 }, desk.fxInput(send.to));
      source.connect(sendStage.input);
      this.sendStages[send.to] = sendStage;
      this.sends[send.to] = sendStage.input as GainNode; // a Gain module's one gain
    }
  }
  volume(volume: number): void {
    this.#volume = volume;
    this.#stages.fader.set('gain.gain', volume);
    if (!this.#muted) {
      this.#stages.room?.set('gain.gain', volume * this.#roomAmount);
    }
  }
  panTo(position: number): void {
    this.#stages.pan?.set('pan.pan', position);
  }
  sendTo(to: string, amount: number): void {
    if (to === this.#roomTo && this.#stages.room) {
      this.#roomAmount = amount;
      if (!this.#muted) {
        this.#stages.room.set('gain.gain', this.#volume * amount);
      }
    } else {
      this.sendStages[to]?.set('gain.gain', amount);
    }
  }
  muted(muting: boolean): void {
    this.#muted = muting;
    this.#stages.input.set('gain.gain', muting ? 0 : 1, MUTE);
    this.#stages.room?.set('gain.gain', muting ? 0 : this.#volume * this.#roomAmount, MUTE);
  }
}
// what a strip sends to: the FX channels its sends name, and its room's, for the routing
export function sentTo(sends: Send[], room: string | null): string[] {
  const to = sends.map((send) => (typeof send === 'string' ? send : send.to));
  return room ? [...to, room] : to;
}
// where a send with an amount is taken: before the fader ('pre', after the inserts), from an insert's tap (or its input), or after
// the fader and the pan
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

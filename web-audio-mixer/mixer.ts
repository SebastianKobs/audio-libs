// ---------- libs/web-audio-mixer/mixer: the desk, its strips by name, the sum, the master's insert, the master and their peaks ----------
import { Channel, sentTo } from './channel.ts';
import type { StripOptions } from './channel.ts';
import { Routing, type StripKind } from '../mixer/index.ts';
import type { Engine, PeakMeter } from '../web-audio-engine/index.ts';
import { FxChannel } from './fx-channel.ts';
import type { FxOptions } from './fx-channel.ts';
import { BuiltModule, GAIN } from '../web-audio-fx/index.ts';
// what the mixer and its strips need of the engine: the context, its time, a meter on a node, a plan built and set, and whether it can pan
export type MixerEngine = Pick<Engine, 'audioContext' | 'now' | 'meter' | 'build' | 'apply' | 'canPan'>;
// where on the desk a strip goes, which the mixer gives it as it's made, the routing having said it may: the node an output reaches (the
// master's sum or a bus's input), and an FX channel's input, for a send
export interface Desk {
  outOf(out: string): AudioNode;
  fxInput(name: string): AudioNode;
}
// a strip on the desk: a channel, a bus or an FX channel
export type Strip = Channel | FxChannel;
// what goes between the sum and the master volume, built by the caller (a limiter, as Ableton's on its master, a chain of libs/web-audio-fx/'s
// Limiter module): its way in and out, where a meter reads inside it, by name ('limiter in', 'limiter out'), and how much it takes away
// now, in dB
export interface MasterInsert {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly points?: Readonly<Record<string, AudioNode>>;
  reduction?(): number;
}

const FADE_IN = 0.25;
const FADE_OUT = 0.08;
const STOP_AFTER = 400; // time constants in s; ms before a pause stops the context

export class Mixer {
  readonly sum: GainNode;
  readonly master: GainNode;
  readonly strips: Record<string, Strip> = {}; // the desk: every channel, bus and FX channel, by name
  readonly routing: Routing; // where each strip goes: its kind, its way out and its sends, mute and solo (X3a); its own, or handed in (Z3)
  readonly #engine: MixerEngine;
  readonly #master: BuiltModule; // the master volume: a Gain module, as the sum
  readonly #desk: Desk;
  readonly #meters: Record<string, PeakMeter> = {};
  readonly #insert: MasterInsert | undefined;
  readonly #points: Record<string, AudioNode>; // besides the strips: the master, and its insert's (the limiter's in and out)
  #volume: number;
  #pausing: ReturnType<typeof setTimeout> | undefined; // the timer that stops it once it has faded

  // routing: where its strips go, its owner's, made before the desk is built, so what's on it is known before there's any sound (Z3);
  // its own otherwise
  constructor(
    engine: MixerEngine,
    { volume = 1, master, routing = new Routing() }: { volume?: number; master?: MasterInsert; routing?: Routing } = {},
  ) {
    this.#engine = engine;
    this.routing = routing;
    this.#master = new BuiltModule(engine, {
      patch: GAIN,
      params: { level: 0 },
      into: engine.audioContext.destination,
    });
    this.master = this.#master.input as GainNode; // a Gain module's one gain
    this.#insert = master;
    this.#volume = volume;
    this.#master.set('gain.gain', volume, FADE_IN); // never start at full volume
    this.sum = new BuiltModule(engine, { patch: GAIN, into: master?.input ?? this.master }).input as GainNode; // as the master
    master?.output.connect(this.master);
    this.#points = { master: this.master, ...master?.points };
    this.#desk = {
      outOf: (out) => this.#outOf(out),
      fxInput: (name) => this.#on(name).input,
    };
  }
  // a channel (see Channel), on the desk by its name, where the routing says it may go
  channel(name: string, options: StripOptions = {}, kind: 'channel' | 'bus' = 'channel'): Channel {
    const out = this.#placed(name, { kind, out: options.out, to: sentTo(options.sends ?? [], options.room ?? null) });
    const channel = new Channel(this.#engine, this.#desk, name, { ...options, out });
    this.strips[name] = channel;
    return channel;
  }
  bus(name: string, options: StripOptions = {}): Channel {
    return this.channel(name, options, 'bus');
  }
  // an FX channel (see FxChannel), a return, as a channel is
  fx(name: string, options: FxOptions = {}): FxChannel {
    const out = this.#placed(name, { kind: 'return', out: options.out, to: Object.keys(options.sends ?? {}) });
    const fxChannel = new FxChannel(this.#engine, this.#desk, { ...options, out });
    this.strips[name] = fxChannel;
    return fxChannel;
  }
  // a strip's way out moved, as the routing allows, then wired: away from where it went, into where it goes now
  route(name: string, out: string): void {
    const from = this.routing.outOf(name);
    this.routing.route(name, out);
    const strip = this.#on(name);
    strip.tail.disconnect(this.#outOf(from));
    strip.tail.connect(this.#outOf(out));
  }
  volume(value: number): void {
    this.#volume = value;
    this.#master.set('gain.gain', value);
  }
  pause(): void {
    const audioContext = this.#engine.audioContext;
    if (audioContext.state !== 'running') {
      return;
    }
    this.#master.set('gain.gain', 0, FADE_OUT);
    this.#pausing = setTimeout(() => {
      this.#pausing = undefined;
      void audioContext.suspend(); // fire and forget: nothing waits for it
    }, STOP_AFTER);
  }
  resume(): void {
    const audioContext = this.#engine.audioContext;
    if (this.#pausing) {
      clearTimeout(this.#pausing);
      this.#pausing = undefined;
      this.#master.set('gain.gain', this.#volume, FADE_IN);
      return;
    } // back before it stopped
    if (audioContext.state === 'running') {
      return;
    }
    const at = this.#engine.now();
    this.#master.automate('gain.gain', [
      ['cancel', at],
      ['set', 0, at],
      ['target', this.#volume, at, FADE_IN],
    ]);
    void audioContext.resume(); // fire and forget, as suspend()
  }
  // how much the master's insert, the limiter, takes away now, in dB; nothing, with none
  reduction(): number {
    return this.#insert?.reduction?.() ?? 0;
  }
  // a strip's peak, as a meter reads it: the loudest sample of the last window, left or right, after its fader and pan; the master's
  // after its insert and its volume; a point its insert names, inside it. Its meter the engine's, made at the first read, so a desk
  // nobody looks at has none
  peak(name: string): number {
    const meter = (this.#meters[name] ??= this.#engine.meter(this.#points[name] ?? this.#on(name).tail));
    return meter.peak();
  }
  // a strip's place on the routing, and so its way out: where the routing says, if it's on it, what's asked agreeing, a way out asked or
  // not; else put on it as asked
  #placed(name: string, asked: { kind: StripKind; out: string | undefined; to: readonly string[] }): string {
    const { routing } = this;
    if (!routing.has(name)) {
      routing.add(name, asked);
      return routing.outOf(name);
    }
    const routed = { kind: routing.kindOf(name), out: routing.outOf(name), to: routing.sentTo(name) };
    const agrees =
      asked.kind === routed.kind && (asked.out ?? routed.out) === routed.out && sameTargets(asked.to, routed.to);
    if (!agrees) {
      throw new Error(`a strip is built where the routing says: ${name}, ${placeOf(routed)}; asked ${placeOf(asked)}`);
    }
    return routed.out;
  }
  // a strip on the desk by its name
  #on(name: string): Strip {
    const strip = this.strips[name];
    if (!strip) {
      throw new Error(`not on the desk: ${name}`);
    }
    return strip;
  }
  // the node a way out reaches: the master's sum, or a bus's input
  #outOf(out: string): AudioNode {
    if (out === 'master') {
      return this.sum;
    }
    return this.#on(out).input;
  }
}
// whether two strips send to the same, in whichever order
function sameTargets(asked: readonly string[], routed: readonly string[]): boolean {
  return asked.length === routed.length && asked.every((target) => routed.includes(target));
}
// a strip's place, as an error names it
function placeOf({ kind, out, to }: { kind: StripKind; out: string | undefined; to: readonly string[] }): string {
  return `a ${kind} out to ${out ?? 'where it says'}, sending to ${to.length ? to.join(', ') : 'none'}`;
}

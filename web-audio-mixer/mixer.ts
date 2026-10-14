// ---------- libs/web-audio-mixer/mixer: the desk, its strips by name, the sum, the master's insert, the master and their peaks ----------
import { Channel } from './channel.ts';
import { sentTo, type StripOptions } from './strip.ts';
import { Routing, type StripKind, MASTER } from '../mixer/index.ts';
import type { Engine, PeakMeter } from '../web-audio-engine/index.ts';
import { FxChannel } from './fx-channel.ts';
import { BuiltModule, GAIN } from '../web-audio-fx/index.ts';
// what the mixer and its strips need of the engine: the context, its time, a meter on a node, a plan built and set, and whether it can pan
export type MixerEngine = Pick<Engine, 'audioContext' | 'now' | 'meter' | 'build' | 'apply' | 'canPan'>;
// The desk as a strip sees it as it's made, the routing having said where it may go:
//   outOf(): the node a way out reaches, the master's sum or a bus's input;
//   fxInput(): an FX channel's input, for a send;
//   returns(): the FX channels on the desk now, in the order they were built;
//   sendAdded(): a send turned up for the first time, put on the routing.
export interface Desk {
  outOf(out: string): AudioNode;
  fxInput(name: string): AudioNode;
  returns(): readonly string[];
  sendAdded(from: string, to: string): void;
}
// a strip on the desk: a channel, a bus or an FX channel
export type Strip = Channel | FxChannel;
// What goes between the sum and the master volume, built by the caller: the master's
// inserts, a chain of libs/web-audio-fx/'s modules (desk.ts), today a limiter as Ableton's.
// Its way in and out; where a meter reads inside it, by name ('limiter in', 'limiter out');
// what it says of itself, by name ('limiter reduction', what the limiter takes away, in dB).
export interface MasterInsert {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly points?: Readonly<Record<string, AudioNode>>;
  readonly readings?: Readonly<Record<string, () => number>>;
}

const FADE_IN = 0.25; // s, a time constant
const FADE_OUT = 0.08; // s, a time constant

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
  #muting: { muted: ReadonlySet<string>; soloed: ReadonlySet<string> } = { muted: new Set(), soloed: new Set() };
  readonly #silent = new Set<string>(); // the strips silent now, as mute and solo have them

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
    this.#master.set('gain.gain', volume, { glide: FADE_IN }); // never start at full volume
    this.sum = new BuiltModule(engine, { patch: GAIN, into: master?.input ?? this.master }).input as GainNode; // as the master
    master?.output.connect(this.master);
    this.#points = { master: this.master, ...master?.points };
    this.#desk = {
      outOf: (out) => this.#outOf(out),
      fxInput: (name) => this.#on(name).input,
      returns: () => Object.keys(this.strips).filter((name) => this.strips[name] instanceof FxChannel),
      sendAdded: (from, to) => this.routing.send(from, to),
    };
  }
  // a channel (see Channel), on the desk by its name, where the routing says it may go
  channel(name: string, options: StripOptions = {}, kind: 'channel' | 'bus' = 'channel'): Channel {
    return this.#made(name, kind, options, (out) => new Channel(this.#engine, this.#desk, name, { ...options, out }));
  }
  bus(name: string, options: StripOptions = {}): Channel {
    return this.channel(name, options, 'bus');
  }
  // an FX channel (see FxChannel), a return, as a channel is
  fx(name: string, options: StripOptions = {}): FxChannel {
    return this.#made(
      name,
      'return',
      options,
      (out) => new FxChannel(this.#engine, this.#desk, name, { ...options, out }),
    );
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
  // The master faded out, quickly. Switching the audio off once it's quiet is the
  // desk's owner's: a desk has no power switch of its own.
  fadeOut(): void {
    this.#master.set('gain.gain', 0, { glide: FADE_OUT });
  }
  // The master faded in again, never at full volume.
  // fromSilence: the audio was off, so from 0; otherwise from where the fade got to.
  fadeIn({ fromSilence = false }: { fromSilence?: boolean } = {}): void {
    if (!fromSilence) {
      this.#master.set('gain.gain', this.#volume, { glide: FADE_IN });
      return;
    }
    const at = this.#engine.now();
    this.#master.automate('gain.gain', [
      ['cancel', at],
      ['set', 0, at],
      ['target', this.#volume, at, FADE_IN],
    ]);
  }
  // which strips are muted and which soloed, as Ableton's mute and solo, by name: each strip silenced as the routing says (silenced()),
  // now, and one made later as it's made; a name not built yet waiting for it (Z4)
  mutes(muted: ReadonlySet<string>, soloed: ReadonlySet<string>): void {
    this.#muting = { muted: new Set(muted), soloed: new Set(soloed) };
    this.#silence();
  }
  // the strips silent now
  get silent(): ReadonlySet<string> {
    return new Set(this.#silent);
  }
  // A reading the master's insert offers, by name, now: what its limiter takes away, in dB
  // ('limiter reduction'); 0 with none, or one it doesn't offer.
  reading(name: string): number {
    return this.#insert?.readings?.[name]?.() ?? 0;
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
  // a strip on the desk by its name, where the routing says it may go, muted or soloed as it's made
  #made<Made extends Strip>(name: string, kind: StripKind, options: StripOptions, make: (out: string) => Made): Made {
    const out = this.#placed(name, { kind, out: options.out, to: sentTo(options.sends ?? []) });
    const strip = make(out);
    this.strips[name] = strip;
    this.#silence();
    return strip;
  }
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
  // each strip silenced or heard as mute and solo say, of those built; only those that change
  #silence(): void {
    const built = (names: ReadonlySet<string>): Set<string> =>
      new Set([...names].filter((name) => name in this.strips));
    const silent = this.routing.silenced(built(this.#muting.muted), built(this.#muting.soloed));
    for (const [name, strip] of Object.entries(this.strips)) {
      if (silent.has(name) === this.#silent.has(name)) {
        continue;
      }
      strip.muted(silent.has(name));
      if (silent.has(name)) {
        this.#silent.add(name);
      } else {
        this.#silent.delete(name);
      }
    }
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
    if (out === MASTER) {
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

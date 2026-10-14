// ---------- libs/web-audio-mixer/desk: a whole desk, built from data ----------
// Its strips' data (libs/desk-plan/) makes its routing as it's made, before there's any sound.
// What it builds as the audio starts (build()):
//   1. The master's insert slots, from its data, a chain in their order, and the mixer on that
//      routing with them between its sum and its master volume, the volume its owner's. Their
//      points and readings named by slot ('limiter in', 'limiter reduction').
//   2. Each strip in its data's order, an FX channel or a bus, at the values its owner hands
//      over (build.ts). A slot whose device is among the device params (libs/web-audio-fx/'s
//      DeviceParams) is built at its params as they play, and set through them.
//   3. Each FX channel's chain of modules, between its way in and its way out: each module as
//      it plays (FxModules), by the effect its data names, its own params among the device
//      params where it has them.
// Each strip's slots' chains are handed back to its owner (built()). Its FX channels' chains
// follow the tempo (tempo()). A device is named by its strip and its slot (deviceAt()).
import { FxChain, type DeviceParams, type FxModules } from '../web-audio-fx/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import type { Patch, Params } from '../synth/index.ts';
import { deviceAt, nameOf, routingOf, type DeskEntry, type Names, type StripEntry } from '../desk-plan/index.ts';
import type { Routing } from '../mixer/index.ts';
import { Mixer, type MasterInsert } from './mixer.ts';
import { buildChannel, buildFxChannel, slotsOf, type BuildOn, type StripValues } from './build.ts';
import type { Insert } from './channel.ts';

// a strip's slots' chains as built, by slot
type Chains = Partial<Record<string, FxChain>>;

const MASTER = 'master'; // the master's name, as the mixer knows it

export class Desk<Named extends Names = Names> {
  readonly routing: Routing; // where its strips go, from its data, before there's any sound
  readonly bus: Record<string, AudioNode> = {}; // each bus's way in, for what plays into it
  readonly chains: Record<string, FxChain> = {}; // each FX channel's chain, by name, once built
  readonly #desk: readonly DeskEntry<Named>[];
  readonly #masterEntry: StripEntry<Named>;
  readonly #devices: Readonly<Record<string, Patch>>;
  readonly #modules: FxModules;
  readonly #moduleOf: (effect: Named['effect']) => string;
  readonly #params: DeviceParams;
  readonly #beat: () => number;
  readonly #valuesOf: (entry: DeskEntry<Named>) => StripValues;
  readonly #built: (strip: string, chains: Chains) => void;
  readonly #volume: () => number;
  #mixer: Mixer | null = null;

  // desk: its strips as data, in the order they're built; master: the master's strip as data,
  // its insert slots
  // devices: the devices a slot may hold, each an FX module, by name
  // modules, moduleOf(): the FX modules as they play, and each effect's module by name
  // params: the device params, a slot's device or a chain's module by deviceAt()
  // beat: a beat's length now, for a device's params in note values
  // valuesOf(): the values a strip is built at, its owner's
  // built(): a strip's slots' chains, handed back as it's built
  // volume(): the master's volume
  constructor({
    desk,
    master = {},
    devices,
    modules,
    moduleOf,
    params,
    beat,
    valuesOf,
    built,
    volume,
  }: {
    desk: readonly DeskEntry<Named>[];
    master?: StripEntry<Named>;
    devices: Readonly<Record<string, Patch>>;
    modules: FxModules;
    moduleOf: (effect: Named['effect']) => string;
    params: DeviceParams;
    beat: () => number;
    valuesOf: (entry: DeskEntry<Named>) => StripValues;
    built: (strip: string, chains: Chains) => void;
    volume: () => number;
  }) {
    this.#desk = desk;
    this.#devices = devices;
    this.#modules = modules;
    this.#moduleOf = moduleOf;
    this.#params = params;
    this.#beat = beat;
    this.#valuesOf = valuesOf;
    this.#built = built;
    this.#masterEntry = master;
    this.#volume = volume;
    this.routing = routingOf(desk);
  }
  // the mixer, once the desk is built
  get mixer(): Mixer | null {
    return this.#mixer;
  }
  // The desk built on the engine, as the audio starts: the mixer, each strip, each FX
  // channel's chain.
  build(engine: Engine): void {
    const master = this.#masterInsert({ engine, beat: this.#beat(), devices: this.#devices });
    const mixer = new Mixer(engine, { volume: this.#volume(), routing: this.routing, ...(master ? { master } : {}) });
    this.#mixer = mixer;
    const on = { mixer, engine, beat: this.#beat(), devices: this.#devices };
    for (const entry of this.#desk) {
      this.#buildStrip(on, entry);
    }
  }
  // Its FX channels' chains follow the tempo, gliding.
  tempo(beat: number): void {
    for (const chain of Object.values(this.chains)) {
      chain.tempo(beat);
    }
  }
  // The master's insert slots, a chain in their order, each into the next; their points and
  // readings named by slot. None with no slots.
  #masterInsert(on: Pick<BuildOn, 'engine' | 'beat' | 'devices'>): MasterInsert | undefined {
    const entry = this.#masterEntry;
    const { inserts, chains } = slotsOf(on, entry, this.#withDevices(MASTER, entry, {}));
    this.#played(MASTER, entry, chains);
    if (!inserts.length) {
      return undefined;
    }
    chained(inserts);
    const slots = Object.entries(chains).filter((slotted): slotted is [string, FxChain] => slotted[1] !== undefined);
    return {
      input: inserts[0]!.input, // one at least, as found
      output: inserts.at(-1)!.output,
      points: Object.fromEntries(slots.flatMap(([slot, chain]) => named(slot, chain.points()))),
      readings: Object.fromEntries(slots.flatMap(([slot, chain]) => named(slot, chain.readings()))),
    };
  }
  // A strip from its data: an FX channel with its chain, or a bus, its way in kept.
  #buildStrip(on: BuildOn, entry: DeskEntry<Named>): void {
    const name = nameOf(entry);
    const values = this.#withDevices(name, entry, this.#valuesOf(entry));
    if (entry.fx) {
      const { strip, chains } = buildFxChannel(on, name, entry, values);
      this.#played(name, entry, chains);
      this.#chainOn(on.engine, entry, name, strip);
      return;
    }
    const { strip, chains } = buildChannel(on, name, entry, values, 'bus');
    this.#played(name, entry, chains);
    this.bus[name] = strip.input;
  }
  // a strip's values, its slots among the device params at their params as they play, over
  // those its owner hands over for other slots
  #withDevices(strip: string, entry: StripEntry<Named>, values: StripValues): StripValues {
    const devices: Partial<Record<string, () => Params>> = {};
    for (const { slot } of entry.inserts ?? []) {
      const device = deviceAt(strip, slot);
      if (this.#params.has(device)) {
        devices[slot] = this.#params.paramsOf(device);
      }
    }
    return { ...values, params: { ...devices, ...values.params } };
  }
  // a strip's chains, handed back, and set through the device params where they're among them
  #played(strip: string, entry: StripEntry<Named>, chains: Chains): void {
    for (const { slot } of entry.inserts ?? []) {
      const device = deviceAt(strip, slot);
      const chain = chains[slot];
      if (chain && this.#params.has(device)) {
        this.#params.playedBy(device, chain);
      }
    }
    this.#built(strip, chains);
  }
  // An FX channel's chain of modules as they play, between its way in and its way out, each
  // module's own params among the device params, where it has them.
  #chainOn(
    engine: Engine,
    entry: DeskEntry<Named>,
    fx: string,
    between: ConstructorParameters<typeof FxChain>[1]['between'],
  ): void {
    const links = entry.chain ?? [];
    const played = links.map((link) => this.#moduleOf(link.effect));
    const modules = links.map((link, index) => ({
      name: link.effect,
      patch: this.#modules.of(played[index]!)!, // a module the owner has, by its name
      params: this.#paramsOf(deviceAt(fx, link.effect)),
    }));
    const chain = new FxChain(engine, {
      between,
      modules,
      context: { beat: this.#beat(), random: Math.random },
    });
    this.chains[fx] = chain;
    this.#modules.playedBy(chain, played);
    for (const link of links) {
      const device = deviceAt(fx, link.effect);
      if (this.#params.has(device)) {
        this.#params.playedBy(device, chain);
      }
    }
  }
  // a chain's module's own params as they play; none for one with none among the device params
  #paramsOf(device: string): () => Params {
    if (!this.#params.has(device)) {
      return () => ({});
    }
    return this.#params.paramsOf(device);
  }
}

// inserts in order, each into the next
function chained(inserts: readonly Insert[]): void {
  for (let index = 1; index < inserts.length; index++) {
    inserts[index - 1]!.output.connect(inserts[index]!.input);
  }
}
// what a slot's chain offers, named by its slot: its 'in' on the slot 'limiter' 'limiter in'
function named<Offered>(slot: string, offered: Readonly<Record<string, Offered>>): [string, Offered][] {
  return Object.entries(offered).map(([name, value]) => [`${slot} ${name}`, value]);
}

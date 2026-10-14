// ---------- libs/web-audio-mixer/track-strips: a track's strip, made from its template as its track is first played ----------
// Each track's strip is made the first time it's asked for, as its first note or change comes,
// and kept. Its owner's hooks decide:
//   - templateOf(): a track's template and the values it's built at; none for a track with no
//     strip of its own here;
//   - made(): the strip as its owner knows it, from the strip and its slots' chains;
//   - setByNotes(): whether a param is set on the strip as the track's notes change it; one
//     that isn't, its owner sets otherwise (a live mix).
// A change is set by its key through its target (target.ts): now, at its time on the audio's
// clock, or gliding by a time constant.
import type { FxChain, Timing } from '../web-audio-fx/index.ts';
import type { Change, ParamKey, StripEntry } from '../desk-plan/index.ts';
import { buildChannel, type BuildOn, type StripValues } from './build.ts';
import type { Channel } from './channel.ts';
import { targetOf } from './target.ts';

// a track's template: its strip as data, and the values it's built at
interface Template {
  entry: StripEntry;
  values?: StripValues;
}
// a strip's slots' chains as built, by slot
type Chains = Partial<Record<string, FxChain>>;
// a track's strip as made: as its owner knows it, and as built, its slots' devices and chains
interface Made<TrackStrip> {
  track: TrackStrip;
  strip: Channel;
  slots: NonNullable<StripEntry['inserts']>;
  chains: Chains;
}
// a change that lands at its time, or glides from it by a time constant

export class TrackStrips<TrackStrip> {
  readonly #on: () => BuildOn;
  readonly #ports: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly #now: () => number;
  readonly #templateOf: (track: string) => Template | null;
  readonly #made: (strip: Channel, chains: Chains, track: string) => TrackStrip;
  readonly #setByNotes: (key: ParamKey) => boolean;
  readonly #strips = new Map<string, Made<TrackStrip>>();

  // on: what a strip is built on now, the desk's mixer and engine, the beat, the devices;
  // ports: each device's ports, by its params' names; now: the clock's time now
  constructor({
    on,
    ports,
    now,
    templateOf,
    made,
    setByNotes,
  }: {
    on: () => BuildOn;
    ports: Readonly<Record<string, Readonly<Record<string, string>>>>;
    now: () => number;
    templateOf: (track: string) => Template | null;
    made: (strip: Channel, chains: Chains, track: string) => TrackStrip;
    setByNotes: (key: ParamKey) => boolean;
  }) {
    this.#on = on;
    this.#ports = ports;
    this.#now = now;
    this.#templateOf = templateOf;
    this.#made = made;
    this.#setByNotes = setByNotes;
  }
  // A track's strip as its owner knows it, once made.
  of(track: string): TrackStrip | undefined {
    return this.#strips.get(track)?.track;
  }
  // A track's strip, made the first time it's asked for; none for a track with no template.
  stripOf(track: string): TrackStrip | null {
    return this.#madeOn(track)?.track ?? null;
  }
  // A change on a track's strip, where its notes set it; its strip made as it comes.
  // Returns false for one it doesn't set: not its notes', a param the strip lacks, a track
  // with no template.
  control(track: string, change: Change): boolean {
    const made = this.#madeOn(track);
    if (!made || !this.#setByNotes(change.key)) {
      return false;
    }
    const target = targetOf(made.strip, change.key, (slot) => this.#slotted(made, slot));
    if (!target) {
      return false;
    }
    target.stage.set(target.port, change.value, this.#timingOf(change));
    return true;
  }
  // a track's strip, made from its template the first time; none for a track with no template
  #madeOn(track: string): Made<TrackStrip> | null {
    const kept = this.#strips.get(track);
    if (kept) {
      return kept;
    }
    const template = this.#templateOf(track);
    if (!template) {
      return null;
    }
    const { strip, chains } = buildChannel(this.#on(), track, template.entry, template.values);
    const made = { track: this.#made(strip, chains, track), strip, slots: template.entry.inserts ?? [], chains };
    this.#strips.set(track, made);
    return made;
  }
  // a slot's chain and the ports its device declares; none for a slot the strip doesn't have
  #slotted(
    { slots, chains }: Made<TrackStrip>,
    slot: string,
  ): { chain: FxChain; ports: Readonly<Record<string, string>> } | undefined {
    const device = slots.find((entry) => entry.slot === slot)?.device;
    const chain = chains[slot];
    if (device === undefined || !chain) {
      return undefined;
    }
    return { chain, ports: this.#ports[device] ?? {} };
  }
  // When a change lands: gliding by its time constant, at its time on the audio's clock, or
  // now once its time has passed.
  #timingOf({ t, glide }: Change): Timing {
    if (glide !== undefined) {
      return { glide };
    }
    if (t > this.#now()) {
      return { at: this.#on().engine.at(t) };
    }
    return 'now';
  }
}

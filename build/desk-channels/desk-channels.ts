// ---------- build/desk-channels/desk-channels: the tracks' channels on a mixing desk ----------
// Each track's channel is its pool's copy on the desk, added the first time its track is
// played on (the mixing desk's channelOf(), which applies the mix to it), the setup saying how it's set:
//   - one its notes set: by them, at their times;
//   - a live one's: as a view sets it, what was set before it's added told it then (the
//     desk's).
import { entryOf } from '../../util/index.ts';
import type { DeskBuilt, DeskSetup, MixingDesk, WayIn } from '../desk/index.ts';
import { whenOf, type Change } from './change.ts';

// Where a track's instrument plugs into the desk: its channel's way in.
export interface ChannelInput<B extends DeskBuilt> {
  into: WayIn<B>;
}

// The tracks' channels, owned by the desk's owner, each by its track's key, the channel's address.
export class DeskChannels<B extends DeskBuilt> {
  readonly #desk: Pick<MixingDesk<B>, 'built' | 'channelOf' | 'set'>;
  readonly #clock: { now(): number };
  readonly #at: (t: number) => number;
  readonly #setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  readonly #ways = new Map<string, WayIn<B>>(); // each track's way into its channel, by its key

  // at(): a time on the clock on the audio's clock
  constructor({
    desk,
    clock,
    at,
    setup,
  }: {
    desk: Pick<MixingDesk<B>, 'built' | 'channelOf' | 'set'>;
    clock: { now(): number };
    at: (t: number) => number;
    setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  }) {
    this.#desk = desk;
    this.#clock = clock;
    this.#at = at;
    this.#setup = setup;
  }
  // Where a track's instrument plugs into the desk, as its first note comes: a way of its own
  // into its channel, the channel added the first time. None for a track with no pool.
  // Tracks play once the audio runs, the desk built.
  inputOf(name: string): ChannelInput<B> | null {
    const channel = this.#desk.channelOf(name);
    if (!channel) {
      return null;
    }
    // built, as tracks play once the audio runs
    const into = entryOf(this.#ways, name, () => this.#desk.built!.wayInto(channel) as WayIn<B>); // what's built hands its own kind
    return { into };
  }
  // A change on a track's channel where its notes set it, at its time on the audio's clock.
  // Its channel added as any controller comes but a live track's, which its instrument adds.
  // Returns false for one it doesn't set: a live track's, a param not its notes', a track
  // with no pool.
  control(track: string, change: Change): boolean {
    if (this.#setup.isLive(track) || !this.#desk.channelOf(track) || this.#setup.setBy(change.address) === undefined) {
      return false;
    }
    const when = whenOf(change, { now: this.#clock.now(), at: this.#at });
    this.#desk.set(change.address, change.value, when);
    return true;
  }
}

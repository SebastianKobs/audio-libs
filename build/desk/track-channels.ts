// ---------- build/desk/track-channels: the tracks' channels on the desk ----------
// Each track's channel is its pool's copy on the desk, added the first time its track is
// played on (desk.ts's channelOf()), the setup saying how it's set:
//   - one its notes set: by them, at their times;
//   - a live one's: as a view sets it, what was set before it's added told it then (the
//     desk's).
// Mute and solo reach a channel as it's added (made(), the mix's apply()).
import type { Clock } from '../../clock/index.ts';
import type { Address } from '../../plan/format/index.ts';
import { entryOf } from '../../util/index.ts';
import type { DeskBuilt, DeskState, WayIn } from './desk-state.ts';
import type { DeskSetup } from './setup.ts';
import { whenOf, type Change } from './strip-controls.ts';

// Where a track's instrument plugs into the desk: its channel's way in.
export interface ChannelInput<B extends DeskBuilt> {
  into: WayIn<B>;
}

// The tracks' channels, owned by the desk's owner, each by its track's key, the channel's address.
export class TrackChannels<B extends DeskBuilt> {
  readonly #desk: Pick<DeskState<B>, 'built' | 'added' | 'channelOf' | 'set'>;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #at: (t: number) => number;
  readonly #made: () => void;
  readonly #setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  readonly #ways = new Map<string, WayIn<B>>(); // each track's way into its channel, by its key

  // made: called each time a track's channel is added, so the mutes reach it (Mix.apply());
  // at(): a time on the clock on the audio's clock
  constructor({
    desk,
    clock,
    at,
    made = () => {},
    setup,
  }: {
    desk: Pick<DeskState<B>, 'built' | 'added' | 'channelOf' | 'set'>;
    clock: Pick<Clock, 'now'>;
    at: (t: number) => number;
    made?: () => void;
    setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  }) {
    this.#desk = desk;
    this.#clock = clock;
    this.#at = at;
    this.#made = made;
    this.#setup = setup;
  }
  // Where a track's instrument plugs into the desk, as its first note comes: a way of its own
  // into its channel, the channel added the first time. None for a track with no pool.
  // Tracks play once the audio runs, the desk built.
  inputOf(name: string): ChannelInput<B> | null {
    const channel = this.#added(name);
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
    if (this.#setup.isLive(track) || !this.#added(track) || this.#setup.setBy(change.address) === undefined) {
      return false;
    }
    const when = whenOf(change, { now: this.#clock.now(), at: this.#at });
    this.#desk.set(change.address, change.value, when);
    return true;
  }

  // A track's channel, added the first time it's asked for, the mutes applied. None for a
  // track with no pool.
  #added(track: string): Address | null {
    const before = this.#desk.added(track);
    const channel = this.#desk.channelOf(track);
    if (channel && !before && this.#desk.added(track)) {
      this.#made();
    }
    return channel;
  }
}

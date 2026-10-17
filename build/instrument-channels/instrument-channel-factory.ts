// ---------- build/instrument-channels/instrument-channel-factory: a channel for each track ----------
// Each track's channel by its key, made the first time it's asked for, then kept: a track's
// instrument holds its sounding voices, so the same one is handed out for its key.
// What's on a track is its owner's (partOf()):
//   - a part: its role, the stream's label, and how its instrument is made, plugged into the
//     track's channel on the desk as its first note comes;
//   - none: a strip of the desk's own, a bus, an FX bus or the master, takes controllers alone;
//     any other key is refused.
import type { Receiver } from '../../midi/index.ts';
import type { Desk, DeskBuilt, WayIn } from '../desk/index.ts';
import { entryOf } from '../../util/index.ts';
import { InstrumentChannel } from './instrument-channel.ts';

// What's on a track, as its owner says: its role, and its instrument, made into where it's
// plugged in.
export interface Part<B extends DeskBuilt> {
  readonly role: string;
  make(into: WayIn<B>): Receiver;
}

export class InstrumentChannelFactory<B extends DeskBuilt> {
  readonly #desk: Pick<Desk<B>, 'inputOf' | 'control' | 'isStripTrack'>;
  readonly #partOf: (key: string) => Part<B> | null;
  readonly #made = new Map<string, InstrumentChannel>();

  // desk: the desk, a track's way into its channel, its strips' controllers, its own strips;
  // partOf: what's on a track, by its key, its owner's
  constructor({
    desk,
    partOf,
  }: {
    desk: Pick<Desk<B>, 'inputOf' | 'control' | 'isStripTrack'>;
    partOf: (key: string) => Part<B> | null;
  }) {
    this.#desk = desk;
    this.#partOf = partOf;
  }
  // a track's channel by its key, made the first time it's asked for
  of(key: string): InstrumentChannel {
    return entryOf(this.#made, key, () => this.#channelOf(key));
  }

  // A track's channel, its strip the channel at its key:
  //   - with a part: its role, its instrument plugged in where the desk says as its first
  //     note comes;
  //   - a strip's own: no instrument;
  //   - none by any other key.
  #channelOf(key: string): InstrumentChannel {
    const part = this.#partOf(key);
    if (part) {
      const make = (): Receiver => part.make(this.#desk.inputOf(key)!.into); // a track with a part has a channel
      return new InstrumentChannel({ strip: key, role: part.role, desk: this.#desk, instrument: make });
    }
    if (!this.#desk.isStripTrack(key)) {
      throw new Error(`no track ${key}: nothing on it, and no strip of the desk's`);
    }
    return new InstrumentChannel({ strip: key, role: 'strip', desk: this.#desk });
  }
}

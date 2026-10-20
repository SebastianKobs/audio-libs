// ---------- view/mixer/models/mixer-groups: the groups of tracks a mixer shows ----------
// What a mixer's tracks section draws, each group in a box of its own:
//   - handed in by a view: the session's tracks in its groups (session-tracks.ts);
//   - else, for a desk alone, its channels as one group (channelGroups()).
import type { Address } from '../../../util/index.ts';
import type { Mixer } from './mixer.ts';

// What a track plays now, as its cell shows it: the clip, a name its play gives after it, a
// dash with none; lit while it sounds; waiting while a play waits for its first note.
export interface TrackNow {
  readonly text: string;
  readonly lit: boolean;
  readonly waiting: boolean;
}
// A track a mixer shows: its channel's address on the desk, its name, what it plays now, and
// whether anything holds it.
export interface MixerTrack {
  readonly address: Address;
  readonly name: string;
  readonly now: TrackNow;
  readonly playing: boolean;
}
// a group of tracks: its key, its header's name, whether it's played live, its tracks
export interface MixerGroup {
  readonly key: string;
  readonly name: string;
  readonly live: boolean;
  readonly tracks: readonly MixerTrack[];
}

// what a desk's channel shows in its cell: nothing played on it
const NOTHING: TrackNow = { text: '—', lit: false, waiting: false };

// A desk's channels as one group, for a mixer drawn with no session:
// its own channels, then each pool's copies added so far.
// Each by its address and its name as shown, holding; none with none.
export function channelGroups(mixer: Pick<Mixer, 'channels'>, name: string): MixerGroup[] {
  const channels = mixer.channels();
  if (!channels.length) {
    return [];
  }
  const tracks = channels.map(({ address, name: shown }) => ({
    address,
    name: shown,
    now: NOTHING,
    playing: true,
  }));
  return [{ key: 'channels', name, live: false, tracks }];
}

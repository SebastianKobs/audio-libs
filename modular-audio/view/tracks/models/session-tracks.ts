// ---------- view/tracks/models/session-tracks: the session's tracks as its desk shows them. Pure ----------
// From a look at the session (session.ts), in the control surface's groups (Tracks):
//   1. the tracks with notes, in the groups' order, those played live marked; a group shows
//      once its first play adds a track;
//   2. each track named from its group's name and numbered from 1, at its channel's address on
//      the desk, with what it plays now;
//   3. what sounded since the last look, for the folded sections' lights: the clips of a group
//      not played live, and each lit track's channel.
import { addressOf } from '../../../../base/util/index.ts';
import type { DeskGroup, DeskTrack } from '../../desk/models/index.ts';
import type { TracksReadout } from '../readout/index.ts';
import type { GroupShown, TrackShown } from './session.ts';

// a track's place, a group's key and its number from 0, onto its channel's address on the desk
type TrackAt = (place: { kind: string; track: number }) => string;

export class SessionTracks {
  readonly #tracks: Pick<TracksReadout, 'groups' | 'clipName'>;
  readonly #trackAt: TrackAt;

  constructor({ tracks, trackAt }: { tracks: Pick<TracksReadout, 'groups' | 'clipName'>; trackAt: TrackAt }) {
    this.#tracks = tracks;
    this.#trackAt = trackAt;
  }
  // the tracks with notes, in their groups, in the control surface's order
  groups(seen: Readonly<Record<string, GroupShown>>): DeskGroup[] {
    return this.#tracks.groups
      .filter(({ group }) => seen[group]?.tracks.length)
      .map(({ group, name, kind, live }) => ({
        key: group,
        name,
        live,
        // seen[group] is there: filtered above
        tracks: seen[group]!.tracks.map((shown, index) => this.#track(group, kind, name, shown, index)),
      }));
  }
  // What sounded since the last look: the clips of a group not played live, by its key
  // ('clips <group>'), and each lit track's channel, by its address as text.
  // What those feed is the desk's.
  sounded(seen: Readonly<Record<string, GroupShown>>): Set<string> {
    const heard = new Set<string>();
    for (const { group, live } of this.#tracks.groups) {
      const shown = seen[group];
      if (!live && shown?.lit.size) {
        heard.add(`clips ${group}`);
      }
      (shown?.tracks ?? []).forEach(({ lit }, index) => {
        if (lit) {
          heard.add(this.#trackAt({ kind: group, track: index }));
        }
      });
    }
    return heard;
  }

  // A track of a group: named from the group's name, numbered from 1.
  // kind: whose clips it plays, as the control surface names them.
  #track(group: string, kind: string, name: string, shown: TrackShown, index: number): DeskTrack {
    const playing = shown.owner ?? shown.waiting;
    return {
      address: addressOf(this.#trackAt({ kind: group, track: index })),
      name: `${name} ${index + 1}`,
      now: {
        text: this.#text(playing, kind, shown.clip),
        lit: shown.lit,
        waiting: !shown.owner && Boolean(shown.waiting),
      },
      playing: Boolean(playing),
    };
  }
  // what a track plays, as its cell says it: its clip, a name its play gives after it; a dash with none
  #text(playing: unknown, kind: string, clip: unknown): string {
    if (!playing) {
      return '—';
    }
    const motif = typeof clip === 'string' ? ` · ${clip}` : '';
    return this.#tracks.clipName(playing, kind) + motif;
  }
}

// ---------- view/models/session-tracks: the session's tracks as its mixer shows them. Pure ----------
// From a look at the session (session.ts), in the control surface's groups (Tracks):
//   1. the tracks with notes, in the groups' order, yours marked; a group shows once its first
//      play adds a track;
//   2. each track named from its group's name and numbered from 1, at its channel's address on
//      the desk, with what it plays now;
//   3. what sounded since the last look, for the folded sections' lights: a replay group's
//      clips, and each lit track's channel.
import { addressOf, type Address } from '../../plan/format/index.ts';
import type { Tracks } from './arrangement/ports.ts';
import type { GroupShown, TrackShown } from './session.ts';

// What a track plays now, as its cell shows it: the clip, a visitor's motif named after it, a
// dash with none; lit while it sounds; waiting while a replay waits for its first note.
export interface TrackNow {
  readonly text: string;
  readonly lit: boolean;
  readonly waiting: boolean;
}
// A track with notes: its channel's address on the desk, its name, what it plays now, and
// whether anything holds it.
export interface SessionTrack {
  readonly address: Address;
  readonly name: string;
  readonly now: TrackNow;
  readonly playing: boolean;
}
// a group of tracks with notes: its key, its header's name, whether it's yours, its tracks
export interface SessionGroup {
  readonly key: string;
  readonly name: string;
  readonly mine: boolean;
  readonly tracks: readonly SessionTrack[];
}
// a track's place, a group's key and its number from 0, onto its channel's address on the desk
type TrackAt = (place: { kind: string; track: number }) => string;

export class SessionTracks {
  readonly #tracks: Pick<Tracks, 'groups' | 'clipName'>;
  readonly #trackAt: TrackAt;

  constructor({ tracks, trackAt }: { tracks: Pick<Tracks, 'groups' | 'clipName'>; trackAt: TrackAt }) {
    this.#tracks = tracks;
    this.#trackAt = trackAt;
  }
  // the tracks with notes, in their groups, in the control surface's order
  groups(seen: Readonly<Record<string, GroupShown>>): SessionGroup[] {
    return this.#tracks.groups
      .filter(({ group }) => seen[group]?.tracks.length)
      .map(({ group, name, kind, mine }) => ({
        key: group,
        name,
        mine,
        // seen[group] is there: filtered above
        tracks: seen[group]!.tracks.map((shown, index) => this.#track(group, kind, name, shown, index)),
      }));
  }
  // What sounded since the last look: a replay group's clips, by its key ('clips flower'),
  // and each lit track's channel, by its address as text. What those feed is the mixer's.
  sounded(seen: Readonly<Record<string, GroupShown>>): Set<string> {
    const heard = new Set<string>();
    for (const { group, mine } of this.#tracks.groups) {
      const shown = seen[group];
      if (!mine && shown?.lit.size) {
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
  #track(group: string, kind: string, name: string, shown: TrackShown, index: number): SessionTrack {
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
  // what a track plays, as its cell says it: its clip, a visitor's motif after it; a dash with none
  #text(playing: unknown, kind: string, clip: unknown): string {
    if (!playing) {
      return '—';
    }
    const motif = typeof clip === 'string' ? ` · ${clip}` : '';
    return this.#tracks.clipName(playing, kind) + motif;
  }
}

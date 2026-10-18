// ---------- view/models/session: what the session view shows of what's played. Pure ----------
// Plays are kept per group of tracks, with what plays on each track:
//   - a replay, on its replay track;
//   - a note of your playing, on a track of its kind's pool.
// A group has as many tracks as its plays ever used.
// Loops: a loop holds its track while it plays (`until` never); each loop note is a play.
// Held notes: a note with no length sounds until its note off, matched by its index.
// groupOf(kind, live): the group a kind's replays go on, so visitors and residents can share one;
// played live, the pool your playing of a kind goes on, none for a kind with none.
// Times are the caller's.
// The plays are read in the session's own words (HeardPlay): the MIDI sequencer's stream fits
// them by their shape.
import { entryOf } from '../../util/index.ts';
import type { TracksReadout } from '../control-surface/index.ts';
import { placedOn } from './placed.ts';

// A play as the session hears it:
//   - owner: what plays it, a plant; clip: the clip it names, a visitor's motif;
//   - kind: whose kind it is; live: your playing as you play it; track: its group's track;
//   - notes: each its start, its length where it has one, its index; ends: held notes' note offs;
//   - until: when it lets go of its track; playback: played back from the recording.
interface HeardPlay {
  readonly owner: unknown;
  readonly kind: string;
  readonly live?: boolean | undefined;
  readonly track?: number | null | undefined;
  readonly clip?: unknown;
  readonly until?: number | undefined;
  readonly playback?: boolean | undefined;
  readonly notes: readonly HeardNote[];
  readonly ends?: readonly NoteEnd[] | undefined;
}
interface HeardNote {
  readonly t: number;
  readonly duration?: number | undefined;
  readonly index?: number | undefined;
}
// a held note's end, matched by its index
interface NoteEnd {
  readonly index: number;
  readonly t: number;
}
// A play as the session keeps it.
// from, to: its first note's start and its last note's end.
// until: when the play lets go of its track.
// freedByNotes: whether the track is let go as soon as the notes end.
// held: the indexes of notes still waiting for their note off.
// ended: the latest note end so far.
interface Kept {
  owner: unknown;
  clip: unknown;
  track: number;
  from: number;
  to: number;
  until: number;
  freedByNotes: boolean;
  playback: boolean;
  held: Set<number>;
  ended: number;
}
// A track as a look shows it: what holds it and whether it sounded since,
// or what waits for it.
export interface TrackShown {
  owner: unknown;
  clip: unknown;
  lit: boolean;
  waiting: unknown;
}
// A group: how many tracks its plays ever used, and the plays it keeps.
interface Group {
  count: number;
  plays: Kept[];
}
// What a look shows of a group: its tracks, and the clips that sounded since the last look.
export interface GroupShown {
  tracks: TrackShown[];
  lit: Set<unknown>;
}

export class Session {
  readonly #tracks: Pick<TracksReadout, 'groupOf'>;
  readonly #groups = new Map<string, Group>();

  constructor(tracks: Pick<TracksReadout, 'groupOf'>) {
    this.#tracks = tracks;
  }
  heard(play: HeardPlay): void {
    if (!play.notes.length && !play.ends?.length) {
      return; // a track's controllers, or a note's later changes: nothing to show
    }
    const placed = this.#placed(play);
    if (!placed) {
      return;
    }
    const { group, track, yours } = placed;
    letGo(group, play, play.ends ?? []);
    if (!play.notes.length) {
      return; // only note offs for held notes, handled by letGo() above
    }
    group.count = Math.max(group.count, track + 1);
    group.plays.push(keptOf(play, track, yours));
  }
  // Where a play goes, on the track it was played on.
  // Your playing goes on its kind's pool, where it has one; a replay on its group.
  // A play on no track goes nowhere.
  #placed(play: HeardPlay): { group: Group; track: number; yours: boolean } | null {
    const placed = placedOn(this.#tracks, play);
    if (!placed) {
      return null;
    }
    return { group: this.#groupNamed(placed.group), track: placed.track, yours: play.live === true };
  }
  // A group by its name, made the first time a play goes on it.
  #groupNamed(name: string): Group {
    return entryOf(this.#groups, name, () => ({ count: 0, plays: [] }));
  }
  // A look at `now`, covering the time since the last look (`since`).
  // Per track: what holds it, whether it sounded since,
  // or else the replay waiting for its first note.
  // Per group: the clips that sounded since, which light.
  // A replay shorter than the time between two looks still lights once.
  // A play's clip: the one it names (a visitor's motif), else its owner (a plant's record).
  // Let go: replays done before the last look, and a loop's older notes but its latest.
  at(now: number, since: number): Record<string, GroupShown> {
    const shown: Record<string, GroupShown> = {};
    for (const [name, group] of this.#groups) {
      const latest = latestOnEachTrack(group.plays, now);
      group.plays = group.plays.filter(
        (play) => play.from > now || play.to >= since || (play.until >= since && latest.get(play.track) === play),
      );
      shown[name] = look(group, now, since);
    }
    return shown;
  }
  // How many plays the session keeps, so tests can check it stays small.
  kept(): number {
    return [...this.#groups.values()].reduce((count, group) => count + group.plays.length, 0);
  }
}
// The latest play begun by now, per track.
function latestOnEachTrack(plays: Kept[], now: number): Map<number, Kept> {
  const latest = new Map<number, Kept>();
  for (const play of plays) {
    if (play.from <= now && !((latest.get(play.track)?.from ?? -Infinity) > play.from)) {
      latest.set(play.track, play);
    }
  }
  return latest;
}
// A group as a look shows it now.
function look(group: Group, now: number, since: number): GroupShown {
  const tracks = Array.from({ length: group.count }, (): TrackShown => ({
    owner: null,
    clip: null,
    lit: false,
    waiting: null,
  }));
  const lit = new Set<unknown>();
  const next: Kept[] = [];
  for (const play of group.plays) {
    if (play.from > now) {
      // placed, its first note still to come
      next.push(play);
      continue;
    }
    const sounded = play.to >= since;
    const track = trackOf(tracks, play.track);
    if (now < play.until || sounded) {
      Object.assign(track, { owner: play.owner, clip: play.clip });
    }
    if (sounded) {
      track.lit = true;
      lit.add(play.clip);
    }
  }
  // An empty track shows the replay placed on it next, waiting for its first note,
  // as a launched clip waits in Ableton.
  for (const play of next.sort((earlier, later) => earlier.from - later.from)) {
    const track = trackOf(tracks, play.track);
    if (!track.owner && !track.waiting) {
      Object.assign(track, { waiting: play.owner, clip: play.clip });
    }
  }
  return { tracks, lit };
}
// The track a play names; a group has as many tracks as its plays ever used.
function trackOf(tracks: TrackShown[], index: number): TrackShown {
  const track = tracks[index];
  if (!track) {
    throw new Error(`a play on track ${index}, past the group's ${tracks.length}`);
  }
  return track;
}
// A play as a group keeps it.
// to: the last note's end; open (Infinity) while a note waits for its note off.
// until: the play's own end, its tail included, where it gives one.
// freedByNotes: the track is let go as the notes end when the tail isn't known here:
//   - your playing;
//   - a play with no end of its own, such as a replay played back from the recording.
function keptOf(play: HeardPlay, track: number, yours: boolean): Kept {
  const from = Math.min(...play.notes.map((note) => note.t));
  const held = new Set(play.notes.filter((note) => note.duration === undefined).map((note) => note.index ?? -1));
  const lengths = play.notes.filter((note) => note.duration !== undefined).map((note) => note.t + note.duration!);
  const ended = Math.max(from, ...lengths);
  const to = held.size ? Infinity : ended;
  return {
    owner: play.owner,
    clip: play.clip ?? play.owner,
    track,
    from,
    to,
    until: play.until ?? to, // held on its track until then
    freedByNotes: yours || play.until === undefined,
    playback: play.playback ?? false,
    held,
    ended,
  };
}
// Held notes let go as their note offs come.
// A play ends once none of its notes is held; its track goes with it if freedByNotes.
// Only the same sender's note off counts: a playback and the live garden number their
// notes apart, each from 0, so an index alone could match the wrong note.
function letGo(
  group: Group,
  { owner, playback = false }: Pick<HeardPlay, 'owner' | 'playback'>,
  ends: readonly NoteEnd[],
): void {
  for (const kept of group.plays.filter(
    (play) => play.owner === owner && play.playback === playback && play.held.size,
  )) {
    for (const end of ends.filter(({ index }) => kept.held.has(index))) {
      kept.held.delete(end.index);
      kept.ended = Math.max(kept.ended, end.t);
    }
    if (kept.held.size) {
      continue;
    }
    kept.to = kept.ended;
    if (kept.freedByNotes) {
      kept.until = kept.to;
    }
  }
}

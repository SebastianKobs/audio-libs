// ---------- midi-sequencer/recorder: what was heard, kept as regions, the last 30 minutes, for an arrangement to show (G1b) ----------
// As Ableton records the session into its arrangement (mockup/architecture/views.md): every play the stream carries, the garden's, yours
// and the background's, into the region it's of (play.region, G1a), told apart by its element and its number, a region's number its
// source's; a play with none, a region of its own; a launched clip's plays left out (E2), as nothing a user launches is recorded. A region
// runs from its first note to the end of its last; a held note open until its note off comes, a play of its own by the note's index, its
// glides added to it (G2a); one still held as its element's next region begins, a held part's as its key changes, ends there and starts
// again in the new region, as it sounds on. Kept for the last 30 minutes, in memory: a note ended before then let go, and a region with none.
// And what moves as it's heard, as automation (G3b): a track's own controllers as its lanes, a lane a controller, by the track's kind and
// number as its regions have them, launched or not; a note's changes after it on the note, its own lanes, as a DAW keeps poly aftertouch
// with its note. Every change heard kept, in time order as Web Audio plays them, but a point that changes nothing, thinned once it's a
// second past, as nothing comes that late; a lane's points before the 30 minutes let go but its last, its value as they start. On the
// timeline since L1c2 (libs/timeline/): each note an event with its own length or open until its note off, each lane's point one that
// holds until the next of its lane, kept for the 30 minutes, what's in effect kept; the regions and lanes the music's own views of them
import type { Seconds } from '../clock/index.ts';
import { endOf, LATEST, Timeline, placed, thinned, type TimedEvent } from '../timeline/index.ts';
import { lastValueAt, samePoint, type LanePoint } from './lanes.ts';
import type { NoteOff, PerNoteController, PerNoteControllerName, PerNoteValues } from '../midi/index.ts';
import type { Play, PlayedNote } from './stream.ts';
import { entryOf } from '../util/index.ts';
import { timedValue } from '../automation/index.ts';

// what a track's lane is known by: the track's kind and number, as its regions have them, and the controller it's of; the track's
// name, as its play was sent to it
interface LaneOf {
  kind: string;
  track: number | null;
  trackName: string | undefined;
  controller: string;
}
// a track's lane (G3b): its kind, number and controller, and its points in time order
export type Lane = LaneOf & { points: readonly LanePoint[] };
// a note as recorded: as the stream carried it, and its changes after it, its own lanes, a per-note controller's points each (G3b);
// held where it came with no length, its end told after it, at a time, as one sent with its length sounds that long whatever holds come
// (P3c1)
export interface RecordedNote extends PlayedNote {
  lanes?: Partial<Record<PerNoteControllerName, LanePoint[]>>;
  held?: true;
}
// a region as recorded: the element it's of and its clip, its kind and role, whether you played it, its replay track and until when it
// holds it, as its first play had them; its notes, and from when to when, an open one's end never
export interface Region {
  owner: unknown;
  clip: unknown;
  kind: string;
  role: string | undefined;
  live: boolean;
  track: number | null;
  trackName: string | undefined;
  until: Seconds | undefined;
  notes: RecordedNote[];
  from: Seconds;
  to: Seconds;
}
// a region as it's kept: its first play, and its notes as they come, the recorder's own copies, the timeline's events, which a held
// note's end and glides change
interface Kept {
  first: Play;
  notes: RecordedNote[];
}

export class Recorder {
  readonly #timeline: Timeline<RecordedNote, LanePoint>; // each note, and each lane's points, the events that hold until the next
  #kept: Kept[] = []; // in the order they began
  readonly #numbered = new Map<unknown, Map<number, Kept>>(); // each element's regions, by their number
  readonly #lanes = new Map<string, Lane>(); // each track's, by its kind, number and controller, in the order they began
  #leftOut: (play: Play) => boolean = () => false; // what its owner says to leave out

  constructor() {
    this.#timeline = new Timeline<RecordedNote, LanePoint>({
      same: (before, after) => samePoint(before, after),
      onLetGo: (gone) => this.#forget(gone),
    });
  }
  // a play the stream carries, into the region it's of; one its sender or its owner leaves out
  // of the recording, left out
  heard(play: Play): void {
    if (play.unrecorded || this.#leftOut(play)) {
      return;
    }
    this.#told(play.owner, play.ends ?? []);
    this.#changed(play.owner, play.changes ?? []);
    this.#controlled(play);
    if (!play.notes.length) {
      return; // only a held note's end, glides or changes, or a track's controllers, told above (G2a, G3b)
    }
    const { kept, carried } = this.#regionOf(play);
    const notes = [...play.notes.map((note) => recorded(note)), ...carried];
    kept.notes.push(...notes);
    this.#timeline.add(notes); // what's past the 30 minutes let go as they come
  }
  // What its owner leaves out, as the transport says: a surface's notes while the
  // arrangement plays back.
  leaveOut(leftOut: (play: Play) => boolean): void {
    this.#leftOut = leftOut;
  }
  // the regions kept at now, in the order they began, those wholly before the last 30 minutes let go
  regions(now: Seconds): Region[] {
    this.#settle(now);
    return this.#kept.map((kept) => regionOf(kept));
  }
  // each track's lanes at now, in the order they began, their points before the last 30 minutes let go but each one's last (G3b)
  lanes(now: Seconds): Lane[] {
    this.#settle(now);
    for (const [key, lane] of this.#lanes) {
      lane.points = this.#timeline.held(key);
    }
    return [...this.#lanes.values()];
  }
  // the timeline as of now, the notes let go and their regions with them; the points that change nothing, once they're settled, left
  // out of every lane, a track's and a note's (G3b)
  #settle(now: Seconds): void {
    this.#timeline.settle(now);
    for (const note of this.#kept.flatMap((kept) => kept.notes)) {
      thinNote(note, now - LATEST); // a note's change that changes nothing, thinned once nothing comes that late
    }
  }
  // a held note's end, as it comes, on its element's note of that index still held (G2a); one let go before it sounded, its note off for
  // a time before its note on's, as a trace winding into a tower ends a phrase's note still to come, no length, never less
  #told(owner: unknown, ends: readonly NoteOff[]): void {
    for (const end of ends) {
      const note = this.#noteOf(owner, end.index, { held: true });
      if (note) {
        this.#timeline.endAt(note, end.t);
      }
    }
  }
  // a note's changes after it, as they come, on its element's latest note of that index, its own lanes (G3b)
  #changed(owner: unknown, changes: readonly PerNoteController[]): void {
    for (const { index, controller, value, t, glide } of changes) {
      const note = this.#noteOf(owner, index);
      if (!note) {
        continue;
      }
      const lanes = (note.lanes ??= {});
      placed((lanes[controller] ??= []), timedValue(value, t, glide));
    }
  }
  // a track's controllers, as they come, each into its lane, a point holding until the next of its lane (G3b)
  #controlled(play: Play): void {
    for (const { controller, value, t, glide } of play.controls ?? []) {
      const of: LaneOf = { kind: play.kind, track: play.track ?? null, trackName: play.trackName, controller };
      const key = JSON.stringify([of.kind, of.track, of.controller]);
      entryOf(this.#lanes, key, () => ({ ...of, points: [] }));
      this.#timeline.hold(key, timedValue(value, t, glide));
    }
  }
  // An element's latest note of an index, from the latest region back:
  //   - held or not, as a change comes for a note still sounding;
  //   - held only (held), as its end or a glide comes.
  #noteOf(owner: unknown, index: number, { held = false }: { held?: boolean } = {}): RecordedNote | undefined {
    for (let at = this.#kept.length - 1; at >= 0; at--) {
      const kept = this.#kept[at]!; // within the list
      if (kept.first.owner !== owner) {
        continue;
      }
      const note = kept.notes.findLast((latest) => latest.index === index && (!held || latest.duration === undefined));
      if (note) {
        return note;
      }
    }
    return undefined;
  }
  // the region a play is of: its element's by its number, or a new one, the notes still held in its element's others ending where it
  // begins and carried into it; with no number, a region of its own
  #regionOf(play: Play): { kept: Kept; carried: RecordedNote[] } {
    if (play.region === undefined) {
      return { kept: this.#begin(play), carried: [] };
    }
    const numbered = entryOf(this.#numbered, play.owner, () => new Map<number, Kept>());
    const known = numbered.get(play.region);
    if (known) {
      return { kept: known, carried: [] };
    }
    const begins = Math.min(...play.notes.map((note) => note.t));
    const carried = [...numbered.values()].flatMap((before) => heldThrough(before, begins));
    const kept = this.#begin(play);
    numbered.set(play.region, kept);
    return { kept, carried };
  }
  #begin(play: Play): Kept {
    const kept: Kept = { first: play, notes: [] };
    this.#kept.push(kept);
    return kept;
  }
  // the notes the timeline let go out of their regions, and each region with none left, from its element's too
  #forget(gone: readonly TimedEvent[]): void {
    const goneNotes = new Set<TimedEvent>(gone);
    for (const kept of this.#kept) {
      kept.notes = kept.notes.filter((note) => !goneNotes.has(note));
    }
    for (const empty of this.#kept.filter((kept) => !kept.notes.length)) {
      const numbered = this.#numbered.get(empty.first.owner);
      numbered?.delete(empty.first.region!); // a region its element numbers has its number
      if (numbered?.size === 0) {
        this.#numbered.delete(empty.first.owner);
      }
    }
    this.#kept = this.#kept.filter((kept) => kept.notes.length);
  }
}

// a note as the recorder keeps it, its own copy: held where it came with no length
// a note as it's kept: the glides sent with it its pitch's lane, as those sent after it are
function recorded({ glides, ...note }: PlayedNote): RecordedNote {
  const kept: RecordedNote =
    glides?.length ? { ...note, lanes: { pitch: glides.map(([t, value]) => ({ value, t })) } } : { ...note };
  if (note.duration === undefined) {
    kept.held = true;
  }
  return kept;
}
// a kept region as it's handed out: its first play's, its notes, from its first to the end of its last
function regionOf(kept: Kept): Region {
  const { owner, clip, kind, role, live, track, trackName, until } = kept.first;
  return {
    owner,
    clip: clip ?? owner,
    kind,
    role,
    live: live ?? false,
    track: track ?? null,
    trackName,
    until,
    notes: kept.notes,
    from: Math.min(...kept.notes.map((note) => note.t)),
    to: Math.max(...kept.notes.map((note) => endOf(note))),
  };
}
// a region's notes still held as its element's next region begins: each ended there, and a copy of it from there, held on
function heldThrough(before: Kept, begins: Seconds): RecordedNote[] {
  const held = before.notes.filter((note) => note.duration === undefined);
  for (const note of held) {
    note.duration = begins - note.t;
  }
  return held.map((note) => carried(note, begins));
}
// a held note carried into its element's next region: from there, its values as they are then, its glides and changes before staying with
// the old (G3b)
function carried(note: RecordedNote, begins: Seconds): RecordedNote {
  const { duration: _ended, lanes: _changed, ...held } = note;
  const copy: RecordedNote = { ...held, t: begins };
  if (Object.keys(note.lanes ?? {}).some((controller) => controller !== 'pitch')) {
    const { pitch: _glided, ...values } = valuesAt(note, begins); // its pitch its own, as it began
    copy.controllers = values;
  }
  return copy;
}
// a note's per-note controllers' values at a time: as it starts, each moved by its latest change by then
export function valuesAt(note: RecordedNote, t: Seconds): PerNoteValues {
  const values: PerNoteValues = { ...note.controllers };
  for (const [controller, points] of Object.entries(note.lanes ?? {}) as [PerNoteControllerName, LanePoint[]][]) {
    const latest = lastValueAt(points, t);
    if (latest !== undefined) {
      values[controller] = latest;
    }
  }
  return values;
}
// a note's lanes thinned, each one's first against its value as it starts, a jump
function thinNote(note: RecordedNote, settled: Seconds): void {
  const { lanes } = note;
  if (!lanes) {
    return;
  }
  for (const [controller, points] of Object.entries(lanes) as [PerNoteControllerName, LanePoint[]][]) {
    const start = note.controllers?.[controller];
    lanes[controller] = thinned(
      points,
      settled,
      samePoint,
      start === undefined ? undefined : { t: note.t, value: start },
    );
  }
}
// where a note ends: at its length, or, held, never yet

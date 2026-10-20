// ---------- view/tracks/readout/arrangement: what the arrangement reads, in its own words ----------
// Types only. Whatever answers fits them by its shape:
//   - the recording (RecordingReadout): a MIDI sequencer's recorder (libs/midi-sequencer/), its regions and lanes;
//   - the tracks (TracksReadout): the control surface that played them, its groups and its clips' names;
//     the session's tracks read them too;
//   - the playhead (PlayheadReadout): the transport, a cue sent on a bus;
//   - the declarations (DeclaredReadout): the desk's view models (declaredBy());
//   - the clock: the one clock (libs/clock/), its time, its 16ths and its grid.
import type { TimedValue } from '../../../automation/index.ts';
import type { Clock, HeardGrid, Seconds, TimeMap } from '../../../clock/index.ts';
import type { ParamSpec } from '../../../params/index.ts';

// A note as recorded:
//   - t, duration: when, and how long; none while it's held;
//   - pitch: a MIDI note number;
//   - controllers.bend: where it slides in from, in semitones;
//   - lanes.pitch: its glides, its pitch's lane;
//   - held: its length told after it, at the time its note off came.
export interface RecordedNote {
  t: Seconds;
  duration?: Seconds | undefined;
  pitch?: number | undefined;
  controllers?: { bend?: number | undefined } | undefined;
  lanes?: { pitch?: readonly TimedValue[] | undefined } | undefined;
  held?: true | undefined;
}
// A region as recorded. Times are clock times; an open region ends never (Infinity).
//   - clip: what it plays, as the tracks name it;
//   - kind: what played it; live: played live, not played back;
//   - track: the number of the track it was played on.
export interface RecordedRegion {
  clip: unknown;
  kind: string;
  live: boolean;
  track: number | null;
  from: Seconds;
  to: Seconds;
  notes: readonly RecordedNote[];
}
// A lane as recorded.
// A track's lane has the track's kind and number, as its regions have them.
// A strip's lane has the strip's name as its kind, and no number.
// trackName: the strip its play was sent to.
// Points: a value at a time, jumping there, or gliding by a time constant.
export interface RecordedLane {
  kind: string;
  track: number | null;
  trackName: string | undefined;
  controller: string;
  points: readonly TimedValue[];
}
// The recording at a time: the regions of the last 30 minutes and the tracks' lanes,
// each in the order they began.
export interface RecordingReadout {
  regions(now: Seconds): readonly RecordedRegion[];
  lanes(now: Seconds): readonly RecordedLane[];
}
// A group of tracks: its key, the name on its header, whose clips its tracks play (kind), and
// whether it's played live, apart from the groups whose clips play.
export interface TrackGroup {
  group: string;
  name: string;
  kind: string;
  live: boolean;
}
// The tracks, in groups, as the control surface that played them names them:
//   - groups: in the order shown;
//   - groupOf(): the group a kind's tracks are in; played live, the group it was played
//     on; none where there's none;
//   - clipName(): a clip's name, in its group;
//   - hasClip(): whether a clip is still there, in its group.
export interface TracksReadout {
  readonly groups: readonly TrackGroup[];
  groupOf(kind: string, live: boolean): string | null;
  clipName(clip: unknown, group: string): string;
  hasClip(clip: unknown, group: string): boolean;
}
// The transport, as the arrangement's playhead reads it; a cue is sent on a bus.
// playhead(): where the playhead is; it moves while the recording plays back.
export interface PlayheadReadout {
  readonly playingBack: boolean;
  playhead(): Seconds | null;
}
// What the desk declares, by a strip's name:
//   - specOf(): a param's range and taper, by its controller there, which its lane is laid
//     on; none for one nothing declares;
//   - controllersOf(): the strip's controllers in the order the sound goes through it.
export interface DeclaredReadout {
  specOf(strip: string, controller: string): ParamSpec | undefined;
  controllersOf(strip: string): readonly string[];
}
// The clock, as the arrangement reads it: now, each 16th as it's scheduled, and the grid as
// it was heard, song time among it.
export type ArrangementClock = Pick<Clock, 'now' | 'onStep'> & { grid: HeardGrid & { readonly song: TimeMap } };

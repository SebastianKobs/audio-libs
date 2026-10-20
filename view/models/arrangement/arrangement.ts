// ---------- view/models/arrangement/arrangement: what was heard, laid out in time, as a model ----------
// As Ableton's arrangement: the same tracks as the session view, a row each, in groups.
// In 16ths and rows; the pixels are its drawer's.
// What it keeps:
//   - the rows: each group folded to its first track until it's unfolded, a track's lanes
//     under it once they're opened;
//   - the regions on their rows, each labelled with its clip, greyed once the clip is gone,
//     kept whole past a hold it rang through (P3c1); the opened tracks' lanes;
//   - the time in view: following the present, or the playhead while it plays back, until
//     it's scrolled back, and again once it's back at the present or a playback starts (P3b);
//   - the playhead where a press in the ruler puts it, on the nearest beat, until it's let
//     go and cued (P2).
// Looked at on every beat while it shows. Where each 16th fell kept from when it's made, so a
// region long past lies in its bar.
import { GridMap, HISTORY, type Seconds, type TimeMap } from '../../../clock/index.ts';
import { SEND_PARAM, type ParamSpec } from '../../../params/index.ts';
import type { TimedValue } from '../../../automation/index.ts';
import { keptWhole } from './note-shapes.ts';
import { playheadAt } from './playhead.ts';
import {
  arrangedStrips,
  laneKeyOf,
  laneRowOf,
  rowKeyOf,
  rowsOf,
  stripOf,
  type ArrangedStrip,
  type Row,
  type SectionLabels,
} from './rows.ts';
import { Toggles, type Mixer } from '../../mixer/models/index.ts';
import { TimeWindow } from './time-window.ts';
import type {
  ArrangementClock,
  DeclaredReadout,
  PlayheadReadout,
  RecordedLane,
  RecordedNote,
  RecordedRegion,
  RecordingReadout,
  TracksReadout,
} from '../../control-surface/index.ts';

// A region on its row: its label, from when to when, clock times, an open one's end never;
// whether it was played live, whether its clip is gone, and its notes (G4b).
export interface PlacedRegion {
  row: string;
  label: string;
  from: Seconds;
  to: Seconds;
  live: boolean;
  gone: boolean;
  notes: readonly RecordedNote[];
}
// An opened lane on its row: its controller, its param's range and taper, its points (G5b).
export interface PlacedLane {
  row: string;
  controller: string;
  spec: ParamSpec;
  points: readonly TimedValue[];
}

export class Arrangement {
  readonly map: GridMap;
  readonly #recording: RecordingReadout;
  readonly #transport: PlayheadReadout;
  readonly #declared: DeclaredReadout;
  readonly #tracks: TracksReadout;
  readonly #strips: readonly ArrangedStrip[];
  readonly #clock: ArrangementClock;
  readonly #cue: (t: Seconds | null) => void;
  readonly #window = new TimeWindow();
  readonly #unfolded = new Toggles(); // the groups unfolded, each folded until it is
  readonly #opened = new Toggles(); // the tracks whose lanes are open, by their rows' keys (G5a)
  #rows: Row[] = [];
  #regions: PlacedRegion[] = [];
  #lanes: PlacedLane[] = [];
  #now: Seconds = 0; // the time of the last frame
  #earliest = 0; // the place it scrolls back to at most: the grid's first bar, or where the recording's 30 minutes start
  #shown = false;
  #playhead: number | null = null; // its place where it's set back, or none, on the present (P2)
  #placing = false; // a press in the ruler, held (P2)
  #playingBack = false; // as the last frame found it: a playback that starts is followed again (P3b)

  // declared: each lane's param's declaration and each strip's controllers in order
  // mixer, sections: the desk's strips with no notes of their own, rows in the sections' groups
  // cue: the playhead set back to a time, or on the present, as the transport is asked it
  constructor({
    recording,
    transport,
    declared,
    tracks,
    mixer,
    sections,
    clock,
    cue,
  }: {
    recording: RecordingReadout;
    transport: PlayheadReadout;
    declared: DeclaredReadout;
    tracks: TracksReadout;
    mixer: Pick<Mixer, 'buses' | 'returns' | 'master'>;
    sections: SectionLabels;
    clock: ArrangementClock;
    cue: (t: Seconds | null) => void;
  }) {
    this.#recording = recording;
    this.#transport = transport;
    this.#declared = declared;
    this.#tracks = tracks;
    this.#strips = arrangedStrips(mixer, sections);
    this.#clock = clock;
    this.#cue = cue;
    this.map = new GridMap({ clock });
    clock.onStep((i) => {
      if (this.#shown && i % 4 === 0) {
        this.look();
      }
    }); // on every beat
  }
  get rows(): readonly Row[] {
    return this.#rows;
  }
  get regions(): readonly PlacedRegion[] {
    return this.#regions;
  }
  get lanes(): readonly PlacedLane[] {
    return this.#lanes;
  }
  // the playhead's place where it's set back, or none, on the present (P2)
  get playhead(): number | null {
    return this.#playhead;
  }
  get following(): boolean {
    return this.#window.following;
  }
  get left(): number {
    return this.#window.left;
  }
  get right(): number {
    return this.#window.right;
  }
  get now(): Seconds {
    return this.#now;
  }
  show(shown: boolean): void {
    this.#shown = shown;
    if (shown) {
      this.look();
    }
  }
  // On every frame while it shows, as much time in view as its drawer has room for:
  //   1. the playhead as the transport has it;
  //   2. the earliest it scrolls back to;
  //   3. a playback that starts followed again;
  //   4. the time in view following the present, or the playhead while it plays back.
  frame(span: number): void {
    this.#now = this.#clock.now();
    this.#followTransport();
    this.#window.setSpan(span);
    this.#earliest = Math.max(0, this.map.placeOf(this.#now - HISTORY));
    this.#followPlaybackAgain();
    this.#window.follow(this.#followed(), this.#earliest);
  }
  // The recording looked at:
  //   - the rows, the lanes under the opened tracks (G5a);
  //   - each region on its row, labelled with its clip, its notes, greyed once its clip is
  //     gone (G4b), kept whole past a hold it rang through (P3c1).
  look(): void {
    const now = this.#clock.now();
    const regions = this.#recording.regions(now);
    const lanes = this.#recording.lanes(now);
    const controllersOf = (strip: string): readonly string[] => this.#declared.controllersOf(strip);
    const beside = { strips: this.#strips, lanes, opened: this.#opened.keys, controllersOf };
    this.#rows = rowsOf(regions, this.#tracks, this.#unfolded.keys, beside);
    this.#lanes = lanes.flatMap((lane) => this.#placedLane(lane));
    this.#regions = this.#placedRegions(regions);
  }
  // a track's lanes opened or closed; every: every track's, as this one goes
  toggleLanes(track: string, every: boolean): void {
    const tracks = this.#rows.filter((row) => row.open !== undefined && !row.header).map((row) => row.key);
    this.#opened.turn(track, every ? tracks : [track]);
    this.look();
  }
  // a group unfolded, or folded to its first track; every: every group, as this one goes
  toggleGroup(group: string, every: boolean): void {
    const groups = this.#rows.filter((row) => row.header).map((row) => row.group);
    this.#unfolded.turn(group, every ? groups : [group]);
    this.look();
  }
  // a press in the ruler: the playhead placed there, until it's let go
  press(place: number): void {
    this.#placing = true;
    this.placeAt(place);
  }
  // the playhead put at a place while the press holds, on the nearest beat; past the present, back on it (P2)
  placeAt(place: number): void {
    if (!this.#placing) {
      return;
    }
    const present = this.map.placeOf(this.#clock.now());
    this.#playhead = playheadAt(place, { present, perBeat: this.map.stepsPerBeat(), earliest: this.#earliest });
  }
  // The press let go, in order:
  //   1. cued: the playhead's time, or none, on the present (P3b);
  //   2. a playback it starts or jumps followed again from there.
  // No press, nothing cued.
  release(): void {
    if (!this.#placing) {
      return;
    }
    this.#placing = false;
    this.#cue(this.#playhead === null ? null : this.map.timeOf(this.#playhead));
    this.#jumped();
  }
  // scrolled by 16ths, more showing what came before: no further than the present, playing back too
  scrollBy(places: number): void {
    this.#window.scrollBy(places, this.map.placeOf(this.#clock.now()), this.#earliest);
  }
  // the playhead as the transport has it, but while a press in the ruler places it: moving with the playback, or back on the present (P3b)
  #followTransport(): void {
    if (this.#placing) {
      return;
    }
    const at = this.#transport.playhead();
    if (at === null) {
      this.#playhead = null;
    } else if (this.#transport.playingBack) {
      this.#playhead = this.map.placeOf(at);
    }
  }
  // a playback that starts, by a click in the ruler or by Play, followed again from where its playhead is (P3b)
  #followPlaybackAgain(): void {
    const playingBack = this.#transport.playingBack;
    if (playingBack && !this.#playingBack && this.#playhead !== null) {
      this.#window.followAgain(this.#playhead);
    }
    this.#playingBack = playingBack;
  }
  // and one that jumps, set back while it plays back
  #jumped(): void {
    if (this.#transport.playingBack && this.#playhead !== null) {
      this.#window.followAgain(this.#playhead);
    }
  }
  // what the time in view follows: the playhead while it plays back, else the present (P3b)
  #followed(): number {
    if (this.#transport.playingBack && this.#playhead !== null) {
      return this.#playhead;
    }
    return this.map.placeOf(this.#now);
  }
  // each region on its row; none for one with no row
  #placedRegions(regions: readonly RecordedRegion[]): PlacedRegion[] {
    const tracks = this.#tracks;
    const song = this.#clock.grid.song;
    return regions.flatMap((region): PlacedRegion[] => {
      const row = rowKeyOf(region, tracks);
      const group = tracks.groupOf(region.kind, false);
      if (row === null || group === null) {
        return [];
      }
      const { clip, from, live } = region;
      const { notes, to } = keptWholeIn(region, song);
      const label = tracks.clipName(clip, group);
      return [{ row, label, from, to, live, gone: !tracks.hasClip(clip, group), notes }];
    });
  }
  // a lane on its row, if its track's lanes are opened (G5b), laid on its param's range as the
  // param's strip declares it; one nothing declares by the fader law, as a send
  #placedLane(lane: RecordedLane): PlacedLane[] {
    const track = laneRowOf(lane, this.#tracks, this.#strips);
    if (track === null || !this.#opened.has(track)) {
      return [];
    }
    const spec = this.#declared.specOf(stripOf(lane), lane.controller) ?? SEND_PARAM;
    return [{ row: laneKeyOf(track, lane.controller), controller: lane.controller, spec, points: lane.points }];
  }
}

// a region's notes kept whole past the holds they rang through (P3c1), and its end with them, as far as its last
function keptWholeIn(region: RecordedRegion, song: TimeMap): { notes: RecordedNote[]; to: Seconds } {
  const notes = region.notes.map((note) => keptWhole(note, song));
  const ends = notes.map((note) => (note.duration === undefined ? -Infinity : note.t + note.duration));
  return { notes, to: Math.max(region.to, ...ends) };
}

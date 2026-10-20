// ---------- view/tracks/models/arrangement/arrangement: what was heard, laid out in time, as a model ----------
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
// Its parts, made here: folded-rows.ts, regions.ts, time-in-view.ts.
// Looked at on every beat while it shows. Where each 16th fell kept from when it's made, so a
// region long past lies in its bar.
import { GridMap, type Seconds } from '../../../../clock/index.ts';
import { FoldedRows } from './folded-rows.ts';
import { placedLane, placedRegions, type PlacedLane, type PlacedRegion } from './regions.ts';
import { arrangedStrips, type ArrangedStrip, type Row, type SectionLabels } from './rows.ts';
import { TimeInView } from './time-in-view.ts';
import type { DeskModel } from '../../../desk/models/index.ts';
import type {
  ArrangementClock,
  DeclaredReadout,
  PlayheadReadout,
  RecordingReadout,
  TracksReadout,
} from '../../readout/index.ts';

export class Arrangement {
  readonly map: GridMap;
  readonly #recording: RecordingReadout;
  readonly #declared: DeclaredReadout;
  readonly #tracks: TracksReadout;
  readonly #strips: readonly ArrangedStrip[];
  readonly #clock: ArrangementClock;
  readonly #folded: FoldedRows;
  readonly #time: TimeInView;
  #regions: PlacedRegion[] = [];
  #lanes: PlacedLane[] = [];
  #shown = false;

  // declared: each lane's param's declaration and each strip's controllers in order
  // desk, instruments, sections: the desk's strips and the instruments with no notes of their
  // own, rows in the sections' groups, the instruments' after the desk's
  // cue: the playhead set back to a time, or on the present, as the transport is asked it
  constructor({
    recording,
    transport,
    declared,
    tracks,
    desk,
    instruments,
    sections,
    clock,
    cue,
  }: {
    recording: RecordingReadout;
    transport: PlayheadReadout;
    declared: DeclaredReadout;
    tracks: TracksReadout;
    desk: Pick<DeskModel, 'buses' | 'returns' | 'master'>;
    instruments: readonly ArrangedStrip[];
    sections: SectionLabels;
    clock: ArrangementClock;
    cue: (t: Seconds | null) => void;
  }) {
    this.#recording = recording;
    this.#declared = declared;
    this.#tracks = tracks;
    this.#strips = [...arrangedStrips(desk, sections), ...instruments];
    this.#clock = clock;
    this.map = new GridMap({ clock });
    this.#folded = new FoldedRows({
      tracks,
      strips: this.#strips,
      controllersOf: (strip) => declared.controllersOf(strip),
    });
    this.#time = new TimeInView({ transport, clock, map: this.map, cue });
    clock.onStep((i) => {
      if (this.#shown && i % 4 === 0) {
        this.look();
      }
    }); // on every beat
  }
  get rows(): readonly Row[] {
    return this.#folded.rows;
  }
  get regions(): readonly PlacedRegion[] {
    return this.#regions;
  }
  get lanes(): readonly PlacedLane[] {
    return this.#lanes;
  }
  // the playhead's place where it's set back, or none, on the present (P2)
  get playhead(): number | null {
    return this.#time.playhead;
  }
  get following(): boolean {
    return this.#time.following;
  }
  get left(): number {
    return this.#time.left;
  }
  get right(): number {
    return this.#time.right;
  }
  get now(): Seconds {
    return this.#time.now;
  }
  show(shown: boolean): void {
    this.#shown = shown;
    if (shown) {
      this.look();
    }
  }
  // On every frame while it shows, as much time in view as its drawer has room for
  frame(span: number): void {
    this.#time.frame(span);
  }
  // The recording looked at:
  //   - the rows, the lanes under the opened tracks (G5a);
  //   - each region on its row, labelled with its clip, its notes, greyed once its clip is
  //     gone (G4b), kept whole past a hold it rang through (P3c1).
  look(): void {
    const now = this.#clock.now();
    const regions = this.#recording.regions(now);
    const lanes = this.#recording.lanes(now);
    this.#folded.look(regions, lanes);
    this.#lanes = lanes.flatMap((lane) =>
      placedLane(lane, {
        tracks: this.#tracks,
        strips: this.#strips,
        opened: this.#folded.opened,
        declared: this.#declared,
      }),
    );
    this.#regions = placedRegions(regions, { tracks: this.#tracks, song: this.#clock.grid.song });
  }
  // a track's lanes opened or closed; every: every track's, as this one goes
  toggleLanes(track: string, every: boolean): void {
    this.#folded.toggleLanes(track, every);
    this.look();
  }
  // a group unfolded, or folded to its first track; every: every group, as this one goes
  toggleGroup(group: string, every: boolean): void {
    this.#folded.toggleGroup(group, every);
    this.look();
  }
  // a press in the ruler: the playhead placed there, until it's let go
  press(place: number): void {
    this.#time.press(place);
  }
  // the playhead put at a place while the press holds, on the nearest beat
  placeAt(place: number): void {
    this.#time.placeAt(place);
  }
  // the press let go: cued, and a playback it starts or jumps followed again from there
  release(): void {
    this.#time.release();
  }
  // scrolled by 16ths, more showing what came before: no further than the present, playing back too
  scrollBy(places: number): void {
    this.#time.scrollBy(places);
  }
}

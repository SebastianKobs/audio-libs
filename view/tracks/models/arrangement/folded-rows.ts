// ---------- view/tracks/models/arrangement/folded-rows: the arrangement's rows, as folded and opened ----------
// Folding: each group folded to its first track until it's unfolded.
// Lanes: a track's lanes under it once they're opened.
// With shift, every group or every track, as the one clicked goes. The rows are rowsOf()'s.
import { Toggles } from '../../../mixer/models/index.ts';
import { rowsOf, type ArrangedStrip, type Row } from './rows.ts';
import type { RecordedLane, RecordedRegion, TracksReadout } from '../../readout/index.ts';

export class FoldedRows {
  readonly #tracks: TracksReadout;
  readonly #strips: readonly ArrangedStrip[];
  readonly #controllersOf: (strip: string) => readonly string[];
  readonly #unfolded = new Toggles(); // the groups unfolded, each folded until it is
  readonly #opened = new Toggles(); // the tracks whose lanes are open, by their rows' keys (G5a)
  #rows: Row[] = [];

  constructor({
    tracks,
    strips,
    controllersOf,
  }: {
    tracks: TracksReadout;
    strips: readonly ArrangedStrip[];
    controllersOf: (strip: string) => readonly string[];
  }) {
    this.#tracks = tracks;
    this.#strips = strips;
    this.#controllersOf = controllersOf;
  }
  get rows(): readonly Row[] {
    return this.#rows;
  }
  // the tracks whose lanes are open, by their rows' keys
  get opened(): ReadonlySet<string> {
    return this.#opened.keys;
  }
  // the rows worked out again from what's recorded
  look(regions: readonly RecordedRegion[], lanes: readonly RecordedLane[]): void {
    this.#rows = rowsOf(regions, this.#tracks, this.#unfolded.keys, {
      strips: this.#strips,
      lanes,
      opened: this.#opened.keys,
      controllersOf: this.#controllersOf,
    });
  }
  // a track's lanes opened or closed; every: every track's, as this one goes
  toggleLanes(track: string, every: boolean): void {
    const tracks = this.#rows.filter((row) => row.open !== undefined && !row.header).map((row) => row.key);
    this.#opened.turn(track, every ? tracks : [track]);
  }
  // a group unfolded, or folded to its first track; every: every group, as this one goes
  toggleGroup(group: string, every: boolean): void {
    const groups = this.#rows.filter((row) => row.header).map((row) => row.group);
    this.#unfolded.turn(group, every ? groups : [group]);
  }
}

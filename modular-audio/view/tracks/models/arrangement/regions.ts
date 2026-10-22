// ---------- view/tracks/models/arrangement/regions: the regions and the opened lanes on their rows ----------
// Regions: labelled with their clips, greyed once gone, kept whole past a hold.
// Lanes: an opened track's, on its param's range as its strip declares it.
import { SEND_PARAM, type ParamSpec } from '../../../../../base/params/index.ts';
import type { TimeMap } from '../../../../../sequencing/clock/index.ts';
import type { Seconds } from '../../../../../base/util/index.ts';
import type { TimedValue } from '../../../../../base/automation/index.ts';
import { keptWhole } from './note-shapes.ts';
import { laneRowOf, rowKeyOf, type ArrangedStrip } from './rows.ts';
import { laneKeyOf, stripOf } from './lane-names.ts';
import type {
  DeclaredReadout,
  RecordedLane,
  RecordedNote,
  RecordedRegion,
  TracksReadout,
} from '../../readout/index.ts';

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
// An opened lane on its row: its controller, its param's range and taper, its points (G5b);
// midi: a MIDI device's, drawn in its own colour.
export interface PlacedLane {
  row: string;
  controller: string;
  spec: ParamSpec;
  points: readonly TimedValue[];
  midi: boolean;
}

// each region on its row; none for one with no row
export function placedRegions(
  regions: readonly RecordedRegion[],
  { tracks, song }: { tracks: TracksReadout; song: TimeMap },
): PlacedRegion[] {
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
export function placedLane(
  lane: RecordedLane,
  {
    tracks,
    strips,
    opened,
    declared,
  }: {
    tracks: TracksReadout;
    strips: readonly ArrangedStrip[];
    opened: ReadonlySet<string>;
    declared: Pick<DeclaredReadout, 'specOf' | 'isMidiDevice'>;
  },
): PlacedLane[] {
  const track = laneRowOf(lane, tracks, strips);
  if (track === null || !opened.has(track)) {
    return [];
  }
  const strip = stripOf(lane);
  const spec = declared.specOf(strip, lane.controller) ?? SEND_PARAM;
  const midi = declared.isMidiDevice(strip, lane.controller);
  return [{ row: laneKeyOf(track, lane.controller), controller: lane.controller, spec, points: lane.points, midi }];
}
// a region's notes kept whole past the holds they rang through (P3c1), and its end with them, as far as its last
function keptWholeIn(region: RecordedRegion, song: TimeMap): { notes: RecordedNote[]; to: Seconds } {
  const notes = region.notes.map((note) => keptWhole(note, song));
  const ends = notes.map((note) => (note.duration === undefined ? -Infinity : note.t + note.duration));
  return { notes, to: Math.max(region.to, ...ends) };
}

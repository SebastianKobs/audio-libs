// ---------- midi-sequencer/recording-data: the recording as plain data, its regions and lanes, to save and to load back ----------
// What the recorder keeps, JSON-safe: each region with its notes (their own lanes, glides and a held one's open end included) and each
// track's lane with its points, times as recorded, with where the recording begins and ends so a loader can shift them onto its clock.
// A region's owner and clip are the sender's own objects, so they're written as ids, one per element: regions of one element stay
// together, and one is told apart from another as the recorder tells them. A version from 1, so a later change is told apart.
import type { Seconds } from '../../base/util/index.ts';
import type { Region } from './recorder.ts';
import type { RecordedNote } from './note-lanes.ts';
import type { Lane } from './track-lanes.ts';

// a region as data: its first play's, its notes; its span left out, as the notes give it
export interface RegionData {
  owner: string;
  clip: string;
  number?: number;
  kind: string;
  role?: string;
  live: boolean;
  track: number | null;
  trackName?: string;
  until?: number | 'never';
  notes: RecordedNote[];
}
// a recording as data: from where it begins to where it ends, as the recorder was asked, its regions in the order they began
export interface RecordingData {
  version: 1;
  begins: Seconds;
  ends: Seconds;
  regions: RegionData[];
  lanes: Lane[];
}

// a region's number among its element's: the recorder keeps it beside the region, not in it
interface NumberedRegion {
  region: Region;
  number: number | undefined;
}

export const RECORDING_VERSION = 1;

// the recording as data at now: ids for the owners, each region, note and lane a copy of its own, nothing undefined, an open end 'never'
export function recordingData(
  numbered: readonly NumberedRegion[],
  lanes: readonly Lane[],
  now: Seconds,
): RecordingData {
  const ids = new Map<unknown, string>();
  const idOf = (element: unknown): string => {
    if (!ids.has(element)) {
      ids.set(element, `element-${ids.size}`);
    }
    return ids.get(element)!; // set just above
  };
  const regions = numbered.map(({ region, number }) => regionData(region, number, idOf));
  const times = [
    ...numbered.map(({ region }) => region.from),
    ...lanes.flatMap((lane) => lane.points.map((point) => point.t)),
  ];
  return plain({ version: RECORDING_VERSION, begins: Math.min(now, ...times), ends: now, regions, lanes: [...lanes] });
}

// a region as data, with ids for its element and its clip
function regionData(region: Region, number: number | undefined, idOf: (element: unknown) => string): RegionData {
  const { owner, clip, kind, role, live, track, trackName, until, notes } = region;
  return {
    owner: idOf(owner),
    clip: idOf(clip),
    ...(number === undefined ? {} : { number }),
    kind,
    ...(role === undefined ? {} : { role }),
    live,
    track,
    ...(trackName === undefined ? {} : { trackName }),
    ...(until === undefined ? {} : { until: until === Infinity ? 'never' : until }),
    notes,
  };
}
// data as its own copy: undefined left out, as JSON leaves it, so what's loaded is what's saved
export function plain<Data>(data: Data): Data {
  return JSON.parse(JSON.stringify(data)) as Data;
}

// ---------- view/models/arrangement/rows: the arrangement's rows and their lanes ----------
import type { RecordedLane, RecordedRegion, TracksReadout } from '../../control-surface/index.ts';
import type { Mixer } from '../mixer.ts';
import { SEND } from '../../../plan/desk/index.ts';
import { addressOf, addressText } from '../../../plan/format/index.ts';
import { entryOf } from '../../../util/index.ts';

// One row of the arrangement.
// Header: the group's name; it folds the group. `open` is set when tracks can fold.
// Track: `open` is set when the track has lanes, and says whether they show.
// Lane: `track` is the key of the track it belongs to; its name is its controller.
export interface Row {
  key: string;
  name: string;
  group: string;
  header: boolean;
  open?: boolean;
  track?: string;
}
// One of the desk's strips that have no notes:
//   - group: the session view's section, by its label: the buses', the returns', the master's;
//   - strip: the name on the desk, which the strip's lanes have as their kind;
//   - name: the name the views show.
export interface ArrangedStrip {
  group: string;
  strip: string;
  name: string;
}
// The mixer's sections the arrangement shows, by the labels the session view gives them.
export type SectionLabels = Readonly<Record<'buses' | 'returns' | 'master', string>>;
// What shows beside the regions: the desk's strips that have no notes,
// the recorded lanes, and the tracks whose lanes are open.
// controllersOf(): a strip's controllers in the order the sound goes through it.
export interface Beside {
  strips: readonly ArrangedStrip[];
  lanes: readonly RecordedLane[];
  opened: ReadonlySet<string>;
  controllersOf: (strip: string) => readonly string[];
}
// A group of rows: its key, the name on its header, and its tracks.
interface Group {
  group: string;
  name: string;
  tracks: { key: string; name: string }[];
}

// Rows mirror the session view's grouping:
//   1. The tracks' groups, in the order the tracks give them: each once used by a
//      region or a lane.
//   2. The desk's strips with no notes: always, as the sections bus, fx and master.
// A group has as many tracks as were ever used.
// Folding: groups start folded to their first track. A header is marked where folding hides
// a track.
// Lanes: a track with lanes is marked. Opened, each lane gets a row under the track,
// in the order the sound goes through the strip.
export function rowsOf(
  regions: readonly RecordedRegion[],
  tracks: TracksReadout,
  unfolded: ReadonlySet<string>,
  { strips = [], lanes = [], opened = new Set(), controllersOf = () => [] }: Partial<Beside> = {},
): Row[] {
  const lanesOn = controllersByRow(lanes, tracks, strips, controllersOf);
  const groups = [...trackGroups(regions, lanes, tracks), ...stripGroups(strips)];
  return groups.flatMap(({ group, name, tracks: grouped }) => [
    headerOf(group, name, grouped.length > 1 ? unfolded.has(group) : undefined),
    ...grouped
      .slice(0, unfolded.has(group) ? undefined : 1)
      .flatMap((row) => withLanes({ ...row, group, header: false }, lanesOn.get(row.key), opened.has(row.key))),
  ]);
}
// The row a region goes on: the region's track in its group.
// Played live, on the group it was played on; played back, on its kind's.
// None when the region has no group or no track.
export function rowKeyOf(region: RecordedRegion, tracks: TracksReadout): string | null {
  const group = tracks.groupOf(region.kind, region.live);
  if (group === null || region.track === null) {
    return null;
  }
  return `${group} ${region.track}`;
}
// The row a lane goes on.
// A lane with a track number: that track in its group. This covers replay tracks,
// background tracks and your pool tracks; a pool's kind is the pool group's name.
// A lane without one: the strip's own row, your kinds' channels included.
// None for a strip that has no row.
export function laneRowOf(lane: RecordedLane, tracks: TracksReadout, strips: readonly ArrangedStrip[]): string | null {
  if (lane.track !== null) {
    const group = tracks.groupOf(lane.kind, false);
    return group === null ? null : `${group} ${lane.track}`;
  }
  if (strips.some(({ strip }) => strip === lane.kind)) {
    return `strip ${lane.kind}`;
  }
  return null;
}
// A group's header. `open` says whether the group is unfolded; left out when nothing folds.
function headerOf(group: string, name: string, open: boolean | undefined): Row {
  const header = { key: group, name, group, header: true };
  return open === undefined ? header : { ...header, open };
}
// The groups that hold tracks, each shown once used, in the tracks' order. Tracks are
// numbered from 1.
function trackGroups(
  regions: readonly RecordedRegion[],
  lanes: readonly RecordedLane[],
  tracks: TracksReadout,
): Group[] {
  const used = tracksUsed(regions, lanes, tracks);
  return tracks.groups
    .filter(({ group }) => used.has(group))
    .map(({ group, name }) => ({
      group,
      name,
      tracks: Array.from({ length: used.get(group)! }, (_track, index) => ({
        key: `${group} ${index}`,
        name: `${name} ${index + 1}`,
      })), // the group is used, as filtered
    }));
}
// The desk's strips, each in its group, in the order given.
function stripGroups(strips: readonly ArrangedStrip[]): Group[] {
  const groups = new Map<string, Group>();
  for (const { group, strip, name } of strips) {
    entryOf(groups, group, () => ({ group, name: group, tracks: [] })).tracks.push({ key: `strip ${strip}`, name });
  }
  return [...groups.values()];
}
// The desk's strips with no notes of their own, as the arrangement's rows show them:
//   1. the buses, each with those that go into it after it;
//   2. the returns;
//   3. the master.
export function arrangedStrips(
  mixer: Pick<Mixer, 'buses' | 'returns' | 'master'>,
  sections: SectionLabels,
): ArrangedStrip[] {
  const buses = mixer.buses.flatMap(({ bus, members }) => [bus, ...members]);
  const master = mixer.master ? [mixer.master] : [];
  return [
    ...buses.map((strip) => arranged(sections.buses, strip)),
    ...mixer.returns.map((strip) => arranged(sections.returns, strip)),
    ...master.map((strip) => arranged(sections.master, strip)),
  ];
}
function arranged(group: string, { address, name }: { address: readonly string[]; name: string }): ArrangedStrip {
  return { group, strip: addressText(address), name };
}
// How many tracks each group uses: its highest track number in regions and lanes, plus one.
function tracksUsed(
  regions: readonly RecordedRegion[],
  lanes: readonly RecordedLane[],
  tracks: TracksReadout,
): Map<string, number> {
  const used = new Map<string, number>();
  const placed = [
    ...regions.map((region) => ({ group: tracks.groupOf(region.kind, region.live), track: region.track })),
    ...lanes.map((lane) => ({ group: tracks.groupOf(lane.kind, false), track: lane.track })),
  ];
  for (const { group, track } of placed) {
    if (group === null || track === null) {
      continue;
    }
    used.set(group, Math.max(used.get(group) ?? 0, track + 1));
  }
  return used;
}
// Each row's lane controllers, sorted in the order the sound goes through the row's strip,
// as the desk lists it; one it doesn't list after, in the order recorded.
function controllersByRow(
  lanes: readonly RecordedLane[],
  tracks: TracksReadout,
  strips: readonly ArrangedStrip[],
  controllersOf: (strip: string) => readonly string[],
): Map<string, string[]> {
  const byRow = new Map<string, { strip: string; controllers: string[] }>();
  for (const lane of lanes) {
    const row = laneRowOf(lane, tracks, strips);
    if (row !== null) {
      entryOf(byRow, row, () => ({ strip: stripOf(lane), controllers: [] })).controllers.push(lane.controller);
    }
  }
  return new Map(
    [...byRow].map(([row, { strip, controllers }]) => [row, inSignalOrder(controllers, controllersOf(strip))]),
  );
}
// The strip a lane is on: the one its play was sent to; a strip's own lane, its kind.
export function stripOf(lane: RecordedLane): string {
  return lane.trackName ?? lane.kind;
}
// Controllers sorted by where each comes through a strip; one it doesn't list after.
function inSignalOrder(controllers: readonly string[], order: readonly string[]): string[] {
  const place = (controller: string): number => {
    const index = order.indexOf(controller);
    return index === -1 ? Infinity : index;
  };
  return controllers.toSorted((first, second) => place(first) - place(second));
}
// A lane row's key: the track's key and the controller.
export function laneKeyOf(track: string, controller: string): string {
  return `${track}: ${controller}`;
}
// A track row, marked when it has lanes. When open, its lanes follow it, one row each,
// named by its controller (laneName()).
function withLanes(track: Row, controllers: readonly string[] | undefined, open: boolean): Row[] {
  if (!controllers) {
    return [track];
  }
  const lanes = controllers.map((controller) => ({
    key: laneKeyOf(track.key, controller),
    name: laneName(controller),
    group: track.group,
    header: false,
    track: track.key,
  }));
  return [{ ...track, open }, ...(open ? lanes : [])];
}
// A lane's name, by its controller: its slot and param, as Ableton names an automation
// lane by its device and param; a send by its return's name; a strip's own by its param.
export function laneName(controller: string): string {
  const [first = '', param] = addressOf(controller); // under its strip: the strip's no part of its name
  if (param === undefined) {
    return first; // a strip's own
  }
  if (first === SEND) {
    return param;
  }
  return `${first} ${param}`;
}

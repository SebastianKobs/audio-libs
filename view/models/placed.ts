// ---------- view/models/placed: where a play goes, its group of tracks and its track ----------
// The session's and the arrangement's alike, as the tracks' groups say:
//   - played live, the pool its kind is played on;
//   - played back, or a lane, its kind's group.
// None where its kind has no group, or it's on no track.
import type { TracksReadout } from '../control-surface/index.ts';

// a play's place: its group's key and its track there, from 0
export interface Placed {
  readonly group: string;
  readonly track: number;
}

export function placedOn(
  tracks: Pick<TracksReadout, 'groupOf'>,
  { kind, live = false, track }: { kind: string; live?: boolean | undefined; track?: number | null | undefined },
): Placed | null {
  const group = tracks.groupOf(kind, live);
  if (group === null || track === null || track === undefined) {
    return null;
  }
  return { group, track };
}

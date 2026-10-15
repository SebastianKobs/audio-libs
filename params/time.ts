// ---------- params/time: a time with a sync switch, as Ableton's ----------
// Both values kept, the switch choosing:
//   - synced: a note value, following the tempo;
//   - free: in milliseconds for a length, in hertz for a rate.
// A device declares it as three params side by side, each its own control and lane:
//   sync, a switch; note, the note value; its free value, named by its unit (ms, hz).
// Its seconds are the clock's, by the tempo.
import type { ParamSpec, RangedSpec } from './spec.ts';
import { SWITCH } from './common.ts';

// what a time's free value is in: a length in milliseconds, or a rate in hertz
export type FreeUnit = 'ms' | 'Hz';
// a time as its three params hold it
export interface Time {
  sync: boolean;
  note: string; // a note value as written: '1/8', dotted '1/8.', a triplet '1/8t'
  free: number; // in its unit
  unit: FreeUnit;
}

// the note values a synced time steps through, shortest first: a 16th triplet to a dotted half
// By length, so a step up is always longer: a triplet comes before the dotted note a step shorter.
export const NOTE_VALUES: readonly string[] = Object.freeze([
  '1/16t',
  '1/16',
  '1/8t',
  '1/16.',
  '1/8',
  '1/4t',
  '1/8.',
  '1/4',
  '1/2t',
  '1/4.',
  '1/2',
  '1/2.',
]);

// A time's three params, as a device declares them, each starting where start has it.
// The free one by octaves: a time doubled is a step as far at any length.
export function timeSpecs({
  unit,
  range,
  start,
}: {
  unit: FreeUnit;
  range: RangedSpec['range'];
  start: Omit<Time, 'unit'>;
}): Readonly<Record<string, ParamSpec>> {
  const free = unit.toLowerCase(); // ms, hz
  const specs: Record<string, ParamSpec> = {
    sync: { ...SWITCH, name: 'sync', default: start.sync ? 1 : 0 },
    note: { name: 'note', choices: NOTE_VALUES, default: start.note },
    [free]: { name: free, unit, range, default: start.free, taper: 'octaves' },
  };
  return Object.freeze(specs);
}

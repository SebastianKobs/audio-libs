// ---------- music/meter/meter: a meter from its grouping, a bar's length in beats, its groups' starts and its pulses ----------
// A beat is a quarter note, whatever the meter's unit: 3+2+2 in 8ths is a bar of 3.5 beats.

// a meter as its grouping: each group's length in units, and the unit's note value, 4 a quarter, 8 an 8th, 16 a 16th
export interface Meter {
  readonly groups: readonly number[];
  readonly unit: number;
}
// a unit's start in a bar, in beats, and how strong it is: 2 the bar's one, 1 another group's start, 0 any other
export interface Pulse {
  readonly at: number;
  readonly weight: 0 | 1 | 2;
}

const GROUPING = /^\d+(\+\d+)*$/;
const NOTE_VALUES: readonly number[] = [1, 2, 4, 8, 16, 32, 64];
const QUARTER = 4; // a beat's note value

// a meter from a grouping written as whole numbers joined by +, 3+2+2, in a unit; refused, saying what it got, where either is wrong
export function meterOf(grouping: string, unit: number): Meter {
  const written = grouping.replaceAll(' ', '');
  const groups = written.split('+').map(Number);
  if (!GROUPING.test(written) || groups.includes(0)) {
    throw new Error(`A meter's grouping is whole numbers above 0 joined by +, as 3+2+2, not "${grouping}"`);
  }
  if (!NOTE_VALUES.includes(unit)) {
    throw new Error(`A meter's unit is a note value, 1, 2, 4 … 64, not ${unit}`);
  }
  return { groups, unit };
}
// a bar's length in beats
export function barBeats(meter: Meter): number {
  return unitsIn(meter) * unitBeats(meter);
}
// each group's start in a bar, in beats, the first on the one
export function groupStarts(meter: Meter): number[] {
  const starts: number[] = [];
  let units = 0;
  for (const group of meter.groups) {
    starts.push(units * unitBeats(meter));
    units += group;
  }
  return starts;
}
// each unit of a bar, its start and its weight; the strong ones those of 1 and more, the groups' starts
export function pulses(meter: Meter): Pulse[] {
  const starts = new Set(groupStarts(meter));
  return Array.from({ length: unitsIn(meter) }, (_, unit) => {
    const at = unit * unitBeats(meter);
    return { at, weight: pulseWeight(at, starts) };
  });
}
function unitsIn(meter: Meter): number {
  return meter.groups.reduce((sum, group) => sum + group, 0);
}
// a unit's length in beats: an 8th half of one
function unitBeats(meter: Meter): number {
  return QUARTER / meter.unit;
}
function pulseWeight(at: number, groupStarts: ReadonlySet<number>): Pulse['weight'] {
  if (at === 0) {
    return 2;
  }
  if (groupStarts.has(at)) {
    return 1;
  }
  return 0;
}

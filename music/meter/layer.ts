// ---------- music/meter/layer: a layer across the bar line, a cycle of its own length ----------
// 3 beats over a bar of 4, a dotted 8th over the beat: the cycle starts with the bar's one and runs on through the bar lines until a
// cycle and a bar start together again, where it resolves.
import { barBeats, type Meter } from './meter.ts';

// a cycle's length in beats, and the positions inside each cycle, beats into it, its start alone where none are given
export interface Layer {
  readonly length: number;
  readonly offsets?: readonly number[];
}

const ON_TIME = 1e-9; // beats: a position this close to a span's edge is on it
const LARGEST_DENOMINATOR = 10000; // a length read as a fraction up to so many parts of a beat

// each position of a layer from a beat on and before another, in time order, the layer started on beat 0
export function layerPositions(layer: Layer, from: number, to: number): number[] {
  const offsets = layer.offsets ?? [0];
  const firstCycle = Math.floor((from - Math.max(...offsets)) / layer.length);
  const lastCycle = Math.ceil(to / layer.length);
  const positions: number[] = [];
  for (let cycle = firstCycle; cycle <= lastCycle; cycle++) {
    for (const offset of offsets) {
      positions.push(cycle * layer.length + offset); // multiplied, not added up, so a long span doesn't drift
    }
  }
  return positions.filter((at) => at > from - ON_TIME && at < to - ON_TIME).sort((one, other) => one - other);
}
// the beat, after the start, where a cycle and a bar first start together again: their least common multiple; Infinity for a length
// no fraction of whole numbers gives, which never comes back to the one
export function resolvesAt(layer: Layer, meter: Meter): number {
  const cycle = fractionOf(layer.length);
  const bar = fractionOf(barBeats(meter));
  if (cycle === undefined || bar === undefined) {
    return Infinity;
  }
  // of two fractions in lowest terms, a/b and c/d: lcm(a, c) / gcd(b, d)
  return (
    leastCommonMultiple(cycle.numerator, bar.numerator) / greatestCommonDivisor(cycle.denominator, bar.denominator)
  );
}
// a length as a fraction in lowest terms, the smallest denominator that gives it: 0.75 as 3/4, 2/3 as 2/3; none past the largest
function fractionOf(value: number): { numerator: number; denominator: number } | undefined {
  for (let denominator = 1; denominator <= LARGEST_DENOMINATOR; denominator++) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(numerator / denominator - value) < ON_TIME) {
      return { numerator, denominator };
    }
  }
  return undefined;
}
function leastCommonMultiple(one: number, other: number): number {
  return (one / greatestCommonDivisor(one, other)) * other;
}
// Euclid's: the remainder taken until it's 0, the last divisor the largest that divides both
function greatestCommonDivisor(one: number, other: number): number {
  let larger = one;
  let smaller = other;
  while (smaller !== 0) {
    [larger, smaller] = [smaller, larger % smaller];
  }
  return larger;
}

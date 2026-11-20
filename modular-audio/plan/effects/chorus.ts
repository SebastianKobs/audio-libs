// ---------- plan/effects/chorus: a Chorus planned at a rate, its lines a third of a turn apart ----------
// Its LFO reaches the second and third lines late by a third and two thirds of its period (chorus.yaml): 120 and 240
// degrees. A macro maps straight, so the lags are worked out here for a rate, written with it as an insert's values.
import type { ValuesByAddress } from '../format/index.ts';

// ms: the second line's lag and the third's, at a rate in Hz
export function chorusLags(rate: number): [second: number, third: number] {
  const period = 1000 / rate;
  return [period / 3, (2 * period) / 3];
}
// a Chorus's values at a rate, its lags with it; the rest of what's asked as given
export function chorusValues({ rate, ...rest }: { rate: number } & Readonly<Record<string, number>>): ValuesByAddress {
  const [second, third] = chorusLags(rate);
  return { ...rest, rate, 'lag 2/ms': second, 'lag 3/ms': third };
}

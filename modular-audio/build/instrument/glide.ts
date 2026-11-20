// ---------- build/instrument/glide: a note's pitch glided as ramps, linear in pitch ----------
// A voice card's glide curve target glides a later pitch by a time constant, on the frequency in Hz:
// a curve fast at first, bending into its pitch, more so the further it goes (Web Audio's
// setTargetAtTime). Its curve ramp is an exponential ramp in Hz, a straight line in pitch, over three
// of the glide's time constants (where the target has got 95 % of the way), from where the pitch is
// then: its last value, or where its last ramp has got to.
import type { Automation } from '../../../base/automation/index.ts';

// a pitch on its way: from a frequency to another, between two times; one held, its times the same
export interface Ramp {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly end: number;
}

const RAMP_TIME_CONSTANTS = 3;

// a pitch held from a time: no ramp left to run
export function heldAt(frequency: number, at: number): Ramp {
  return { from: frequency, to: frequency, start: at, end: at };
}
// A pitch jumped to at a time, where its last ramp had got to by then: its own ramp, of no length.
export function jumpedTo(last: Ramp, frequency: number, at: number): Ramp {
  return { from: rampAt(last, at), to: frequency, start: at, end: at };
}
// A pitch glided to at a time, from where its last ramp had got to by then: its own ramp, and its
// automation, the pitch there set, then ramped; what was scheduled from then cancelled.
export function glidedTo(
  last: Ramp,
  frequency: number,
  at: number,
  glide: number,
): { readonly ramp: Ramp; readonly events: readonly Automation[] } {
  const from = rampAt(last, at);
  const length = glide * RAMP_TIME_CONSTANTS;
  return {
    ramp: { from, to: frequency, start: at, end: at + length },
    events: [
      ['cancel', at],
      ['set', from, at],
      ['exp', frequency, at + length],
    ],
  };
}

// where a ramp has its frequency at a time: exponential, so its pitch moves straight (a pitch's frequency is never 0)
function rampAt({ from, to, start, end }: Ramp, t: number): number {
  if (t >= end) {
    return to;
  }
  if (t <= start) {
    return from;
  }
  const share = (t - start) / (end - start);
  return from * (to / from) ** share;
}

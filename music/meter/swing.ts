// ---------- music/meter/swing: swing as a ratio, a straight position to its swung one and back ----------
// The ratio is the first 8th, or 16th, of each pair to the second: 1 straight, 2 a triplet swing, 3 a dotted 8th and a 16th. The
// bending is base/util's, the clock's too: sequencing/clock's swing is 0 straight and 1 a triplet, 3(r − 1)/(r + 1) of a ratio r.
import { swung, unswung } from '../../base/util/index.ts';

// how a part swings: its ratio, and whether 8ths swing, in pairs a beat long, or 16ths, in pairs an 8th long
export interface Swing {
  readonly ratio: number;
  readonly on: '8ths' | '16ths';
}

const CLOCK_TRIPLET = 3; // the clock's swing is how late the second half starts, in thirds of a half

// where a straight position, in beats, sounds swung
export function swungPosition(at: number, swing: Swing): number {
  return swung(at, swingHalf(swing), late(swing.ratio));
}
// and back
export function straightPosition(at: number, swing: Swing): number {
  return unswung(at, swingHalf(swing), late(swing.ratio));
}
// a ratio as the clock's swing, 0 straight and 1 a triplet
export function clockSwingOf(ratio: number): number {
  return CLOCK_TRIPLET * late(ratio);
}
// and the clock's swing as a ratio
export function swingRatioOf(clockSwing: number): number {
  return (CLOCK_TRIPLET + clockSwing) / (CLOCK_TRIPLET - clockSwing);
}
// in beats: an 8th or a 16th, half of a swung pair
function swingHalf(swing: Swing): number {
  return swing.on === '8ths' ? 0.5 : 0.25;
}
// how late the second half starts, a share of a half: the halves r to 1 make it (r − 1)/(r + 1)
function late(ratio: number): number {
  return (ratio - 1) / (ratio + 1);
}

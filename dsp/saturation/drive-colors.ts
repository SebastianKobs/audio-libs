// ---------- dsp/saturation/drive-colors: each drive style's color, before its curve and after it ----------
// Before: what it feeds the curve fuller, so that part breaks up first.
// After: what it rounds off, the DC block between.
// The numbers are starting points, estimates; EQ gains in dB, as a BiquadFilterNode takes them.
import type { DriveStyle } from './drive-curve.ts';

export interface Shelf {
  readonly hz: number;
  readonly dB: number;
}

export interface Peak extends Shelf {
  readonly q: number; // a plain ratio, as a peaking biquad reads it
}

export interface StyleColor {
  readonly before: { readonly lowShelf?: Shelf; readonly peak?: Peak; readonly highShelf?: Shelf };
  readonly after: { readonly lowShelf?: Shelf; readonly onePole?: number; readonly lowpass?: number }; // Hz, 6 or 12 dB an octave
}

export const STYLE_COLORS: Readonly<Record<DriveStyle, StyleColor>> = Object.freeze({
  smooth: { before: {}, after: { onePole: 14000 } },
  console: {
    before: { lowShelf: { hz: 120, dB: 3 }, highShelf: { hz: 6000, dB: 2 } },
    after: { lowShelf: { hz: 120, dB: -3 } },
  }, // beefy lows, an airy top, its level back
  germanium: { before: { lowShelf: { hz: 90, dB: 2 }, peak: { hz: 900, dB: 2, q: 0.7 } }, after: { lowpass: 10000 } }, // weighty, focused mids
  triode: { before: { peak: { hz: 200, dB: 2, q: 0.8 } }, after: { onePole: 12000 } }, // punch: the body bent harder
  pentode: { before: { peak: { hz: 2500, dB: 3, q: 0.9 } }, after: { lowpass: 12000 } }, // crack and crunch
});

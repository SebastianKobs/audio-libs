// ---------- dsp/saturation/drive-curve: a drive's curves, by style, and its auto gain after them ----------
// After Decapitator's design: the drive is a gain into a knee fixed at full scale.
// So a quiet sound driven harder gets dirtier, never cleaner.
// The level is taken back after the curve, against a sine at -18 dBFS.
// Each style is a curve of the family sat_k(u) = u / (1 + |u|^k)^(1/k).
// k is its knee's order: 1.5 soft, 5 near a clip.
// Each is biased by b, (sat(u + b) - sat(b)) / sat'(b): off-center,
// so its top and bottom bend apart, which makes even harmonics. 0 stays at 0, its slope there 1.
// Its heat is an input gain of its own, so at one drive smooth is cleanest and pentode crunchiest.
// Curves and heats are estimates, tuned so the harmonic ordering holds from +15 to +24 dB of drive.

import { saturated } from './shaper-curve.ts';

export type DriveStyle = (typeof DRIVE_STYLES)[number];

// a style's curve: its knee's order, its bias, its heat
export interface StyleCurve {
  readonly order: number;
  readonly bias: number;
  readonly heat: number;
}

export const DRIVE_STYLES = ['smooth', 'console', 'germanium', 'triode', 'pentode'] as const;

export const STYLE_CURVES: Readonly<Record<DriveStyle, StyleCurve>> = Object.freeze({
  smooth: { order: 1.5, bias: 0.1, heat: 0.5 }, // tape and tube: the softest knee, a little 2nd
  console: { order: 3, bias: 0.05, heat: 1.3 }, // transistor and transformer: near symmetric, 3rd
  germanium: { order: 2.5, bias: 0.25, heat: 0.9 }, // germanium's lopsided softness: 2nd under 3rd
  triode: { order: 2, bias: 0.35, heat: 2 }, // the 2nd leading
  pentode: { order: 5, bias: 0.02, heat: 3 }, // a hard knee, odd harmonics, the loudest
});

export const CURVE_SPAN = 8; // u across the curve's table, ±8: sat(8) ≈ 0.99, the clamp past it the saturation anyway
const DRIVE_CURVE_POINTS = 4097; // odd, one at 0; fine enough for a quiet sound's bend near the middle
const PUNISH = 10; // +20 dB on top of the drive
export const REFERENCE = 10 ** (-18 / 20); // the sine auto gain holds level: a peak of -18 dBFS
const SINE_POINTS = 256; // of the reference sine auto gain reads

// a style's curve at u, as its WaveShaper bends it: clamped past its span as the table's ends are
export function styleBent(style: DriveStyle, u: number): number {
  const { order, bias } = STYLE_CURVES[style];
  const clamped = Math.min(CURVE_SPAN, Math.max(-CURVE_SPAN, u));
  return (saturated(clamped + bias, order) - saturated(bias, order)) / slopeAt(bias, order);
}

// the table a WaveShaper reads: its input -1 to 1 across its points, u = CURVE_SPAN · x
export function driveCurve(style: DriveStyle, points = DRIVE_CURVE_POINTS): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  const middle = (points - 1) / 2;
  for (let i = 0; i < points; i++) {
    curve[i] = styleBent(style, ((i - middle) / middle) * CURVE_SPAN);
  }
  curve[middle] = 0; // exact: silence stays silent
  return curve;
}

// u per unit of input: the drive, punished or not, and the style's heat
export function curveGain(style: DriveStyle, drive: number, punish: number): number {
  return drive * (punish >= 0.5 ? PUNISH : 1) * STYLE_CURVES[style].heat;
}

// c(g) = the gain that brings the reference sine back to its level after the curve at gain g: by RMS, its DC taken off as
// the DC block does. ≈ 1/g at low drive, settling near the reference at high.
export function autoGain(style: DriveStyle, gain: number): number {
  let sum = 0;
  let squares = 0;
  for (let i = 0; i < SINE_POINTS; i++) {
    const bent = styleBent(style, gain * REFERENCE * Math.sin((2 * Math.PI * i) / SINE_POINTS));
    sum += bent;
    squares += bent * bent;
  }
  const mean = sum / SINE_POINTS;
  const heard = Math.sqrt(Math.max(0, squares / SINE_POINTS - mean * mean));
  return heard > 0 ? REFERENCE / Math.SQRT2 / heard : 1;
}

// sat_k's slope at u: (1 + |u|^k)^(-1/k - 1)
function slopeAt(u: number, order: number): number {
  return (1 + Math.abs(u) ** order) ** (-1 / order - 1);
}

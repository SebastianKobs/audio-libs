// ---------- dsp/saturation: curves a waveshaper reads, and a drive's styles (its entry) ----------
// Its parts:
//   - shaper-curve.ts: a curve from a drive and a shape;
//   - drive-curve.ts: a drive's styles, their curves and the auto gain after them;
//   - drive-colors.ts: what each style does to the sound before its curve and after it.
export { CURVE_POINTS, saturated, shaperCurve } from './shaper-curve.ts';
export {
  autoGain,
  CURVE_SPAN,
  curveGain,
  DRIVE_STYLES,
  driveCurve,
  REFERENCE,
  STYLE_CURVES,
  styleBent,
  type DriveStyle,
  type StyleCurve,
} from './drive-curve.ts';
export { STYLE_COLORS, type Peak, type Shelf, type StyleColor } from './drive-colors.ts';

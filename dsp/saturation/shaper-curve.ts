// ---------- dsp/saturation/shaper-curve: a waveshaper's curve, from its drive and its shape ----------
// y = sat(drive · x) / drive, sat(u) = u / (1 + |u|^k)^(1/k).
// A quiet sound passes at unity. A loud one is bent from its knee at 1 / drive of full scale.
// It never comes out louder than it went in: headroom is kept, however hard it's driven.
// The knee's order k from its shape: 2 a soft, tape-like knee; 10 a hard one, near a clip.
// An odd count of points, one at 0, so silence stays silent.

export const CURVE_POINTS = 2049;
const KNEE = { soft: 2, hard: 10 } as const;

// a saturation of a knee's order: straight below 1, bending to ±1 past it
export function saturated(u: number, order: number): number {
  return u / (1 + Math.abs(u) ** order) ** (1 / order);
}

// the curve a WaveShaper reads, its input -1 to 1 across its points
export function shaperCurve(drive: number, shape: number, points = CURVE_POINTS): Float32Array<ArrayBuffer> {
  const order = KNEE.soft + (KNEE.hard - KNEE.soft) * Math.min(1, Math.max(0, shape));
  const gain = Math.max(1e-3, drive); // a drive of nothing as straight as can be
  const curve = new Float32Array(points);
  const middle = (points - 1) / 2;
  for (let i = 0; i < points; i++) {
    const x = (i - middle) / middle;
    curve[i] = saturated(gain * x, order) / gain;
  }
  return curve;
}

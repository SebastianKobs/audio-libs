// ---------- dsp/modal/cantilever: a uniform beam clamped at one end, free at the other ----------
// Euler-Bernoulli bending, as Rayleigh solved it: mode n at the n-th root βL of cos(βL)·cosh(βL) = -1, its
// frequency growing as (βL)², its shape a sum of cos, cosh, sin and sinh. A tine's or a tongue's modes, before
// any support along it: a support is a contact at its place, not a change of shape.

/** A mode's frequency against the first: 1, 6.267, 17.55, 34.39, 56.84 … (Rayleigh's 6.2669 the second). */
export function cantileverRatio(mode: number): number {
  return (rootOf(mode) / rootOf(0)) ** 2;
}

/**
 * How far a mode moves at a place along the beam, 0 at the clamp, 1 at the free end: normalized so its square
 * sums to 1 over the length, 0 and level at the clamp, ±2 at the free end (the first mode up).
 */
export function cantileverShape(mode: number, position: number): number {
  const root = rootOf(mode);
  const along = root * position;
  // σ ties the hyperbolic half to the circular one so the free end carries no moment and no shear;
  // cosh − σ·sinh is written e^-x + (1 − σ)·sinh, as both halves near 10⁷ by the sixth mode cancel in doubles
  const beyondSigma = (Math.sin(root) - Math.cos(root) - Math.exp(-root)) / (Math.sinh(root) + Math.sin(root));
  const sigma = 1 - beyondSigma;
  return Math.exp(-along) + beyondSigma * Math.sinh(along) - Math.cos(along) + sigma * Math.sin(along);
}

// βL of a mode: Newton on cos(x) + 1/cosh(x), the same roots as cos·cosh = -1 without the overflow of cosh,
// from (n + ½)·π, which the roots approach as they rise
function rootOf(mode: number): number {
  let root = mode === 0 ? 1.875 : (mode + 0.5) * Math.PI;
  for (let step = 0; step < 50; step++) {
    const value = Math.cos(root) + 1 / Math.cosh(root);
    const slope = -Math.sin(root) - Math.tanh(root) / Math.cosh(root);
    const change = value / slope;
    root -= change;
    if (Math.abs(change) < 1e-15 * root) {
      break;
    }
  }
  return root;
}

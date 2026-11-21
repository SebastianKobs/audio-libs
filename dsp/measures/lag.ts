// ---------- dsp/measures/lag: how late a click comes back, in samples ----------
// An oversampled WaveShaper holds its sound back by its resampling filters.
// No spec fixes the amount (Chromium 128 samples at 2x, 192 at 4x; Firefox 8).
// It is measured by a click rendered through it, so a dry path can be held back to match.

// the samples from where a click went in to where its echo is loudest; none where nothing came back
export function lagOf(heard: Float32Array, clickAt: number): number {
  let loudest = clickAt;
  for (let i = clickAt; i < heard.length; i++) {
    if (Math.abs(heard[i]!) > Math.abs(heard[loudest]!)) {
      loudest = i;
    }
  }
  return loudest - clickAt;
}

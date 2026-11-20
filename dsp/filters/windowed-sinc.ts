// ---------- libs/dsp/filters/windowed-sinc: the tap of an interpolating filter, a sinc under a Kaiser window ----------

const KAISER_BETA = 8; // a stopband near -70 dB: the error of a point stays far under a hundredth of a dB

/**
 * A sinc at `distance` samples from its middle, under a Kaiser window `reach` samples each side:
 * the weight of one sample in a filter that reads a point between samples.
 */
export function windowedSinc(distance: number, reach: number): number {
  return sinc(distance) * kaiser(distance / reach);
}

function sinc(distance: number): number {
  if (distance === 0) {
    return 1;
  }
  return Math.sin(Math.PI * distance) / (Math.PI * distance);
}

// a window that is 1 at 0 and falls to nearly 0 at ±1
function kaiser(position: number): number {
  return besselI0(KAISER_BETA * Math.sqrt(Math.max(0, 1 - position * position))) / besselI0(KAISER_BETA);
}

// the series Σ ((x/2)^k / k!)² → a loop that adds terms until they stop mattering
function besselI0(value: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; term > 1e-12 * sum; k++) {
    term *= (value / (2 * k)) ** 2;
    sum += term;
  }
  return sum;
}

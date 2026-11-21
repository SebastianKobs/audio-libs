// ---------- dsp/filters/biquad: a second-order filter run over samples ----------
// The direct form I difference equation, with its state in doubles:
// a low corner at 32 bit float would ring with rounding.

// y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] - a1·y[n-1] - a2·y[n-2]
export interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

// the filtered samples, in `output` where one is handed in, else in a new array
// the same array as the input filters in place: each x is read before its y is written
export function runBiquad(
  samples: ArrayLike<number>,
  { b0, b1, b2, a1, a2 }: Biquad,
  output: Float64Array = new Float64Array(samples.length),
): Float64Array {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return output;
}

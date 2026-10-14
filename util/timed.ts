// ---------- util/timed: a value at a time, and when a value lands ----------

// a value at a time: jumping there, or gliding there from its time by a time constant (glide), as an automation point's curve
export interface TimedValue {
  value: number;
  t: number;
  glide?: number | undefined;
}
// when a value lands, by a caller that knows no clock:
//   - neither: now, the caller's now;
//   - at: from a time of the caller's, at once;
//   - glide: gliding there from now, by this time constant.
export interface When {
  at?: number | undefined;
  glide?: number | undefined;
}

// a value at a time, a glide kept only where there is one
export function timedValue(value: number, t: number, glide?: number): TimedValue {
  if (glide === undefined) {
    return { value, t };
  }
  return { value, t, glide };
}
// a value handed on when asked, as a value at a time, now the caller's
export function timedAt(value: number, { at, glide }: When, now: number): TimedValue {
  if (glide !== undefined) {
    return { value, t: now, glide };
  }
  return { value, t: at ?? now };
}

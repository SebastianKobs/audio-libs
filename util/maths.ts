// ---------- util/maths: a value clamped, eased, stepped smoothly, an angle or a place wrapped ----------

export function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a)); // angle difference into -pi..pi
}
export function easeOut(v: number): number {
  return 1 - Math.pow(1 - clamp01(v), 3);
}
// 0 up to the low edge, 1 from the high one, eased between, as GLSL's
export function smoothstep(low: number, high: number, value: number): number {
  const position = clamp01((value - low) / (high - low));
  return position * position * (3 - 2 * position);
}
export function wrapToTile(v: number, T: number): number {
  return v - T * Math.round(v / T); // into -T/2..T/2: specks and spores tile round the view, so the floor never ends
}

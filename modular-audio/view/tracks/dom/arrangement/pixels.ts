// ---------- view/tracks/dom/arrangement/pixels: the time in view in pixels, as the drawer lays it out ----------

export const STEP_PX = 8; // px: a 16th's width, a bar 128 px, fixed for now, a zoom later (Default)

// a place's x in view, from the place at its left edge
export function xOf(place: number, left: number): number {
  return (place - left) * STEP_PX;
}
// the place under an x, the other way, for a click in the ruler
export function placeAt(x: number, left: number): number {
  return left + x / STEP_PX;
}

// ---------- util/swing: a place swung late within pairs of equal halves, and back ----------
// Swing bends time within each pair of halves: the second half starts late, by `late` of a half, the first stretched and the second
// squeezed to make room, so each pair starts and ends where it would. A late of 1/3 is a triplet swing, its halves 2:1. Places and
// halves are in any unit, a 16th or a beat, the same for both.

// where a straight place sounds, swung
export function swung(place: number, half: number, late: number): number {
  const pairStart = 2 * half * Math.floor(place / (2 * half));
  const into = place - pairStart;
  return pairStart + (into < half ? into * (1 + late) : half * (1 + late) + (into - half) * (1 - late));
}
// and back
export function unswung(place: number, half: number, late: number): number {
  const pairStart = 2 * half * Math.floor(place / (2 * half));
  const into = place - pairStart;
  return pairStart + (into < half * (1 + late) ? into / (1 + late) : half + (into - half * (1 + late)) / (1 - late));
}

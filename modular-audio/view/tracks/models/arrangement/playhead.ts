// ---------- view/tracks/models/arrangement/playhead: where a click in the ruler puts the playhead ----------

// what a click is measured against: the present's place, a beat's length, and the earliest place it may go, all in 16ths
interface Bounds {
  present: number;
  perBeat: number;
  earliest: number;
}

// the playhead a click in the ruler puts at a place: on the nearest beat, so Play starts on one, never
// before the earliest, its first beat after; at or past the present, or a beat's rounding onto it, none, the playhead back on the present
export function playheadAt(place: number, { present, perBeat, earliest }: Bounds): number | null {
  if (place >= present) {
    return null;
  }
  const onBeat = Math.round(place / perBeat) * perBeat;
  const placed = Math.max(Math.ceil(earliest / perBeat) * perBeat, onBeat);
  return placed >= present ? null : placed;
}

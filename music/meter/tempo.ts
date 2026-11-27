// ---------- music/meter/tempo: beats and milliseconds at a tempo, a beat a quarter note ----------

const MS_A_MINUTE = 60000;

// so many beats at bpm quarters a minute, in ms
export function beatsToMs(beats: number, bpm: number): number {
  return (beats * MS_A_MINUTE) / bpm;
}
// and back
export function msToBeats(ms: number, bpm: number): number {
  return (ms * bpm) / MS_A_MINUTE;
}

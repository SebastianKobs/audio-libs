// ---------- clock/song-time: song time, the time the music played, its holds taken out ----------

// a clock time to a time along a timeline, its holds taken out, and back: the grid's song time is one
export interface TimeMap {
  toTimeline(t: number): number;
  fromTimeline(along: number): number;
}
// a hold the music went through: from where it stood to when it went on
interface Hold {
  from: number;
  to: number;
}

// s: how far back the music's history is kept: the grid's holds, a timeline's events, an arrangement's view
export const HISTORY = 30 * 60;
const KEEP_HOLDS = HISTORY + 60; // s: the holds kept for song time, the history and a minute more

export class SongTime {
  readonly #holds: Hold[] = []; // each hold it went through, from when to when, in time order (P3b)
  #stoodAt: number | null = null; // where the music stands while held: the time of the 16th it's held at

  // held: the music standing from a time on
  stand(at: number): void {
    this.#stoodAt = at;
  }
  // released at a time: the hold kept, those past the history and a minute let go
  goOn(t: number): void {
    const from = this.#stoodAt;
    if (from === null) {
      return;
    }
    this.#stoodAt = null;
    this.#holds.push({ from, to: Math.max(t, from) });
    while (this.#holds.length && this.#holds[0]!.to < t - KEEP_HOLDS) {
      this.#holds.shift();
    }
  }
  // the holds forgotten, as the grid starts; a stand going on kept
  clear(): void {
    this.#holds.length = 0;
  }
  // a clock time's song time, the time the music played up to it (P3b): the holds it
  // went through taken out, a stop's, or live play's while the arrangement played back,
  // as the arrangement shows them, standing; within one, where it stood, at the 16th it
  // was held at, those handed out before it played on; held now, all from it at it
  songTime(t: number): number {
    if (t === Infinity) {
      return t; // never, held or not
    }
    let song = t;
    for (const { from, to } of this.#holdsSoFar()) {
      if (t > from) {
        song -= Math.min(t, to) - from;
      }
    }
    return song;
  }
  // and back: the clock time a song time was played at, past the holds; where it's held now, there's none, never
  timeOfSong(song: number): number {
    let t = song;
    for (const { from, to } of this.#holdsSoFar()) {
      if (t > from) {
        t += to - from;
      }
    }
    return t;
  }
  // its holds, and one going on, held now, to never, each from where the music stood
  #holdsSoFar(): Hold[] {
    return this.#stoodAt === null ? this.#holds : [...this.#holds, { from: this.#stoodAt, to: Infinity }];
  }
}

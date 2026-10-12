// ---------- clock/beat-grid: the 16ths on the clock, their swing, and the next one to schedule ----------
// swing bends time within each 8th, counted in 16ths: the second 16th comes late, by a third of a 16th at swing 1 (a triplet swing), and
// anything between the grid follows smoothly. With "swing on" 8ths it bends each beat instead, as jazz swings: the second 8th comes late,
// by a third of an 8th at 1, and the 16ths in between follow. Phrases are kept straight, as places on the grid, and played with the swing as
// it is now

// a time signature: so many beats of a unit, [4, 4]
export type Meter = [beats: number, unit: number];
// what the grid reads live: the tempo, the swing and what it swings, the time signature
export interface GridSettings {
  bpm: number;
  swing: number;
  swingOn: string;
  meter?: Meter;
}

const ROUNDING = 1e-9; // s: a 16th's time added up step by step and worked out at once may differ by as much (P3b)
const KEEP_HOLDS = 31 * 60; // s: the holds kept for song time, the recording's 30 minutes and a minute more

// the beat grid: 16ths at the settings' tempo, swung as they are now; it runs once the audio starts (start()), standing at its first 16th
// until then, the next 16th to schedule its straight time on the clock (nextStepTime) and its number (nextStepNumber). Held, its place,
// the song position, stays while the clock's time runs on, no 16th handed out, and released it goes on from there (hold(), release(), the
// transport's stop, P1); its holds kept, so a time's song time, the time the music played, takes them out (songTime(), timeOfSong(), P3b)
export class BeatGrid {
  readonly #settings: GridSettings;
  #nextStepTime = 0;
  #nextStepNumber = 0;
  #running = false;
  #held: number | null = null; // the place it's held at, while held (P1)
  #heldAt = 0; // and the time it was held at: a time before it lies where it did (P2)
  #stoodAt = 0; // and the time of the 16th it's held at, where the music stands, the 16ths handed out before it playing on: song time's
  #holdFrom: number | null = null; // the time it's to be held from, the 16ths before it handed out first (P3b)
  readonly #holds: { from: number; to: number }[] = []; // each hold it went through, from when to when, in time order (P3b)

  constructor(settings: GridSettings) {
    this.#settings = settings;
  }
  get nextStepTime(): number {
    return this.#nextStepTime;
  }
  get nextStepNumber(): number {
    return this.#nextStepNumber;
  }
  get running(): boolean {
    return this.#running;
  }
  get held(): boolean {
    return this.#held !== null;
  }
  // the time it was held at, while held; none while it runs (P2)
  get heldAt(): number | null {
    return this.#held === null ? null : this.#heldAt;
  }
  meter(): Meter {
    return this.#settings.meter ?? [4, 4]; // the master's time signature, [beats, unit]: a pattern's, unless it has its own
  }
  // one 16th
  stepDuration(): number {
    return 60 / this.#settings.bpm / 4;
  }
  // how late a 16th of the grid sounds
  swingAt(i: number): number {
    return (this.#warp(i) - i) * this.stepDuration();
  }
  // where a time near now lies on the grid if nothing swung, in 16ths; while held, from the time it was held at, the place it's held at;
  // not started yet, its first 16th, where the music will start, whatever the time: not counted from the page's load
  straightAt(t: number): number {
    if (!this.#running) {
      return this.#nextStepNumber;
    }
    if (this.#held !== null && t >= this.#heldAt) {
      return this.#held;
    }
    return this.#nextStepNumber + (t - this.#nextStepTime) / this.stepDuration();
  }
  // where a time near now lies on the straight grid: the place that sounds then, swung
  stepAt(t: number): number {
    return this.#unwarp(this.straightAt(t));
  }
  // when a place on the grid sounds, swung as it is now
  timeAt(place: number): number {
    return this.#nextStepTime + (this.#warp(place) - this.#nextStepNumber) * this.stepDuration();
  }
  // when a place on the grid sounds if nothing swung: what was played straight
  straightTime(place: number): number {
    return this.#nextStepTime + (place - this.#nextStepNumber) * this.stepDuration();
  }
  // held at a time: its place kept while the clock's time runs on, no 16th handed out; the place the first 16th not handed out yet, those
  // before it scheduled ahead and played, so nothing jumps as it goes on (P2); past it, where the ticks lagged, the place then
  hold(t: number): void {
    if (this.#held !== null) {
      return;
    }
    this.#held = Math.max(this.#nextStepNumber, this.straightAt(t));
    this.#heldAt = t;
    this.#stoodAt = this.#running ? Math.max(t, this.straightTime(this.#held)) : t;
  }
  // held from a time on, the beat the arrangement plays back from (P3b): the 16ths before it handed out, none from it, its place held there,
  // so what played goes on up to it; held already, held as it is
  holdFrom(t: number): void {
    if (this.#held === null) {
      this.#holdFrom = t;
    }
  }
  // released at a time: going on from the place it was held at, its next 16th at once; one to be held from a time no longer; the hold
  // kept for song time
  release(t: number): void {
    this.#holdFrom = null;
    const held = this.#held;
    if (held === null) {
      return;
    }
    this.#held = null;
    this.#holds.push({ from: this.#stoodAt, to: Math.max(t, this.#stoodAt) });
    while (this.#holds.length && this.#holds[0]!.to < t - KEEP_HOLDS) {
      this.#holds.shift();
    }
    this.#nextStepTime = t + (this.#nextStepNumber - held) * this.stepDuration();
  }
  // a clock time's song time, the time the music played up to it (P3b): the holds it went through taken out, a stop's or the live garden's
  // while the arrangement played back, as the arrangement shows them, standing; within one, where it stood, at the 16th it was held at,
  // those handed out before it played on; held now, all from it at it
  songTime(t: number): number {
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
  // the grid starts with the audio, its first 16th at `at`
  start(at: number): void {
    this.#holds.length = 0;
    this.#nextStepTime = at;
    this.#nextStepNumber = 0;
    this.#running = true;
  }
  // the 16ths due before dueBefore, each handed to due(i, t) with its swung time; those before missedBefore skipped silently, when the
  // ticks lagged, so the grid keeps its place
  schedule(missedBefore: number, dueBefore: number, due: (i: number, t: number) => void): void {
    if (this.#held !== null) {
      return; // held: the music no longer listening (P1)
    }
    const holdFrom = this.#holdFrom === null ? null : this.#holdFrom - ROUNDING;
    if (holdFrom !== null && holdFrom <= dueBefore) {
      dueBefore = holdFrom; // the 16ths before it, then held there (P3b)
    }
    while (this.#nextStepTime < missedBefore) {
      this.#nextStepTime += this.stepDuration();
      this.#nextStepNumber++;
    }
    while (this.#nextStepTime < dueBefore) {
      due(this.#nextStepNumber, this.#nextStepTime + this.swingAt(this.#nextStepNumber));
      this.#nextStepTime += this.stepDuration();
      this.#nextStepNumber++;
    }
    if (holdFrom !== null && this.#nextStepTime >= holdFrom) {
      this.#held = this.#nextStepNumber;
      this.#heldAt = this.#stoodAt = this.#nextStepTime;
      this.#holdFrom = null;
    }
  }
  // its holds, and one going on, held now, to never, each from where the music stood
  #holdsSoFar(): { from: number; to: number }[] {
    return this.#held === null ? this.#holds : [...this.#holds, { from: this.#stoodAt, to: Infinity }];
  }
  // in 16ths: half of what swings
  #swingHalf(): number {
    return this.#settings.swingOn === '8ths' ? 2 : 1;
  }
  #warp(place: number): number {
    const late = this.#settings.swing / 3;
    const half = this.#swingHalf();
    const pairStart = 2 * half * Math.floor(place / (2 * half));
    const into = place - pairStart;
    return pairStart + (into < half ? into * (1 + late) : half * (1 + late) + (into - half) * (1 - late));
  }
  #unwarp(place: number): number {
    const late = this.#settings.swing / 3;
    const half = this.#swingHalf();
    const pairStart = 2 * half * Math.floor(place / (2 * half));
    const into = place - pairStart;
    return pairStart + (into < half * (1 + late) ? into / (1 + late) : half + (into - half * (1 + late)) / (1 - late));
  }
}

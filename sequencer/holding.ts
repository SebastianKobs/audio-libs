// ---------- libs/sequencer/holding: how long the plays on one track hold it. Pure ----------
// (N5) Never while one is held open, its end not known yet, else until the latest end of those that aren't, as several notes from one
// place share a voice (track-pool.ts). Times are the caller's
export class Holding {
  #open = 0;
  #latest = -Infinity;

  // a play on it: held open (until never), or ending then
  add(until: number): void {
    if (until === Infinity) {
      this.#open += 1;
      return;
    }
    this.#latest = Math.max(this.#latest, until);
  }
  // a play held open, ended then
  end(until: number): void {
    this.#open = Math.max(0, this.#open - 1);
    this.#latest = Math.max(this.#latest, until);
  }
  get until(): number {
    if (this.#open) {
      return Infinity;
    }
    return this.#latest;
  }
}

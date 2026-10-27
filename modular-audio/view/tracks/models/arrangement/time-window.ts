// ---------- view/tracks/models/arrangement/time-window: the time in view, following the present or the playhead, or scrolled back ----------

const AHEAD = 16; // 16ths: following, the head a bar from the right edge

// the time in view, in 16ths: following a head, the present, or the playhead while it plays back, as time goes on: the head running
// across the view until it's a bar from the right edge, then the view scrolling with it, never back by itself; a young recording from its
// start at the left edge. Scrolled back, held where it was until it's scrolled back to the present, as Ableton's arrangement follows
// (views.md), or a playback starts; never before the earliest kept
export class TimeWindow {
  #right = 0; // the place at the right edge
  #span = 0; // 16ths: how much time it shows
  #following = true;

  get left(): number {
    return this.#right - this.#span;
  }
  get right(): number {
    return this.#right;
  }
  get following(): boolean {
    return this.#following;
  }
  // how much time it shows, in 16ths, as wide as its drawer has room for
  setSpan(span: number): void {
    this.#span = span;
  }
  follow(head: number, earliest = -Infinity): void {
    if (this.#following) {
      this.#right = Math.max(this.#right, head + AHEAD, earliest + this.#span);
    }
  }
  // following again from a head that starts, a playback's, scrolled back or not: where it's in view the view stays, the head running
  // across it as the present does; out of view, or past where it's followed, brought a bar from the right edge
  followAgain(head: number): void {
    this.#following = true;
    if (head < this.left || head > this.#right - AHEAD) {
      this.#right = head + AHEAD;
    }
  }
  // moved by a drag or a wheel, by 16ths, more showing what came before: no further than the present, playing back too, or before the
  // earliest
  scrollBy(places: number, now: number, earliest: number): void {
    const latest = now + AHEAD;
    const right = Math.min(latest, this.#right - places);
    this.#right = Math.max(right, earliest + this.#span);
    this.#following = this.#right >= latest;
  }
}

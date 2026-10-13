// ---------- libs/sequencer/track-pool: overlapping plays allotted to tracks, as a polysynth allots its voices. Pure ----------
// (mockup/architecture/views.md) A track plays one play at a time, from its start until its tail has died away, so a
// play never catches another's tail. A play goes on the track its owner played on last, if that's free, else the lowest free one; with
// none free, a track is added. Tracks are never taken away, so there are as many as ever played at once. A play held open, its end not
// known as it starts, holds its track until it's ended (end()). A play may join its owner's track while the owner still holds it, as notes
// from one place share a voice, the track held until the later end (N5). Times are the caller's
import { Holding } from './holding.ts';

// a track: whose play holds it, from when until its tail has died away
export interface Track {
  owner?: object;
  from?: number;
  until?: number;
}
export class TrackPool {
  readonly tracks: Track[] = [];
  readonly #last = new WeakMap<object, number>(); // an owner's last track, let go with the owner
  readonly #holding: Holding[] = []; // how long each track is held, by its index

  // puts a play of an owner's, lasting from one time until another, on a track; its index. join: it may go on the track its owner still
  // holds, a play from the same place, the track held until the later end (N5)
  place(owner: object, from: number, until: number, { join = false }: { join?: boolean } = {}): number {
    const held = this.#heldBy(owner, from);
    if (join && held !== null) {
      this.#hold(held, until);
      return held;
    }
    let index = this.#last.get(owner);
    if (index == null || !this.#free(index, from)) {
      index = this.tracks.findIndex((_track, candidate) => this.#free(candidate, from));
    }
    if (index < 0) {
      index = this.tracks.push({}) - 1;
    }
    this.tracks[index] = { owner, from };
    this.#holding[index] = new Holding();
    this.#hold(index, until);
    this.#last.set(owner, index);
    return index;
  }
  // a play's end, once it's known: one held open as it started (until Infinity) ended, its track free once its tail, and those of the
  // plays that joined it, have died away (N2, N5)
  end(index: number, until: number): void {
    const holding = this.#holding[index];
    if (!holding) {
      return;
    }
    holding.end(until);
    this.#setUntil(index);
  }
  // the track an owner still holds at a time, its last one, if it's still its and busy
  #heldBy(owner: object, at: number): number | null {
    const index = this.#last.get(owner);
    if (index == null || this.tracks[index]?.owner !== owner || this.#free(index, at)) {
      return null;
    }
    return index;
  }
  // a play on a track: held open, never ending until it's ended, or ending at its time
  #hold(index: number, until: number): void {
    this.#holding[index]!.add(until); // set as the track's play was placed
    this.#setUntil(index);
  }
  #setUntil(index: number): void {
    this.tracks[index]!.until = this.#holding[index]!.until; // set as the track's play was placed
  }
  #free(index: number, from: number): boolean {
    const until = this.tracks[index]?.until; // a track just added holds nothing yet, and isn't free
    return until !== undefined && until <= from;
  }
}

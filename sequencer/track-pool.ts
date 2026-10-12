// ---------- libs/sequencer/track-pool: overlapping plays allotted to tracks, as a polysynth allots its voices. Pure ----------
// (mockup/architecture/views.md) A track plays one play at a time, from its first note until its last note's tail has died away, so a
// play never catches another's tail. A play goes on the track its owner played on last, if that's free, else the lowest free one; with
// none free, a track is added. Tracks are never taken away, so there are as many as ever played at once. Times are the caller's
// a track: whose play holds it, from when until its tail has died away
export interface Track {
  owner?: object;
  from?: number;
  until?: number;
}
export class TrackPool {
  readonly tracks: Track[] = [];
  readonly #last = new WeakMap<object, number>(); // an owner's last track, let go with the owner

  // puts a play of an owner's, sounding from one time until another, on a track; its index
  place(owner: object, from: number, until: number): number {
    let index = this.#last.get(owner);
    if (index == null || !this.#free(index, from)) {
      index = this.tracks.findIndex((_track, candidate) => this.#free(candidate, from));
    }
    if (index < 0) {
      index = this.tracks.push({}) - 1;
    }
    this.tracks[index] = { owner, from, until };
    this.#last.set(owner, index);
    return index;
  }
  #free(index: number, from: number): boolean {
    const until = this.tracks[index]?.until; // a track just added holds nothing yet, and isn't free
    return until !== undefined && until <= from;
  }
}

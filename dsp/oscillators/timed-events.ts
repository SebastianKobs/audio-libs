// ---------- dsp/oscillators/timed-events: events told ahead, handed out at their frames in a block ----------
// For a processor of objects that keep sounding, not voices that start and stop: a pluck or a damp
// arrives from the page ahead of its time and acts at its sample. Late ones act at once, never dropped.
import type { BlockClock } from './scheduled-voice.ts';

interface Timed<Event> {
  readonly at: number;
  readonly event: Event;
}

/** Events at their times on the context's clock, in seconds, handed out in time order, each once. */
export class TimedEvents<Event> {
  // kept in time order, those at one time in the order they came
  readonly #waiting: Timed<Event>[] = [];

  add(at: number, event: Event): void {
    this.#waiting.splice(this.#indexAfter(at), 0, { at, event });
  }

  /** Each event due before this block of `frames` ends, at its frame in it (a late one at 0), then forgotten. */
  due({ sampleRate, currentTime }: BlockClock, frames: number, visit: (event: Event, frame: number) => void): void {
    // rounded as ScheduledVoice rounds its start, so both land on the same sample
    const frameOf = (at: number): number => Math.max(0, Math.round((at - currentTime) * sampleRate));
    let count = 0;
    while (count < this.#waiting.length && frameOf(this.#waiting[count]!.at) < frames) {
      count++;
    }
    for (const { at, event } of this.#waiting.splice(0, count)) {
      visit(event, frameOf(at));
    }
  }

  // the first place whose time is later than this one: a binary search, as a block may hold many
  #indexAfter(at: number): number {
    let low = 0;
    let high = this.#waiting.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (this.#waiting[middle]!.at <= at) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }
}

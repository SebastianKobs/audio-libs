// ---------- view/tracks/models/clip-tracks: the clip tracks, as a session view shows them ----------
// A clip track for each of a control surface's, its clips read from what holds them:
//   - a clip player's slots, whether a clip plays the player's to say;
//   - the surface's own, for the clips on no player.
// A clip's ▶ launches it. Its × asks first, as deleting is a deliberate, confirmed action.
// It reads the clip slots' readout (ClipsReadout, modular-audio/view/tracks/readout/clips.ts).
import type { Clock } from '../../../../sequencing/clock/index.ts';
import type { Seconds } from '../../../../base/util/index.ts';
import type { ClipsReadout, ClipTrack } from '../readout/index.ts';

// A clip on its clip track: its slot, as its holder knows it, its name, how many notes it
// holds, none for one that holds no notes, and whether it plays.
export interface ShownClip {
  slot: unknown;
  name: string;
  notes: number | undefined;
  playing: boolean;
}

// A clip's ×: the first click asks.
// A second click on it, after a moment and within 3 s, deletes the clip.
// Anything else, or nothing for 3 s, stops asking.
// Never as fast as a double-click, so nothing goes by a slip.
const ASKS_FOR = 3; // s, on the clock
const TOO_FAST = 0.4; // s, on the clock

// The clip tracks (see the top of this file).
// launch(), remove(): a clip asked to play, or to go, by its slot.
export class ClipTracks {
  readonly #surface: ClipsReadout;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #launch: (slot: unknown) => void;
  readonly #remove: (slot: unknown) => void;
  #asking: { slot: unknown; at: Seconds } | null = null; // a ×, asking "delete?"

  constructor({
    surface,
    clock,
    launch,
    remove,
  }: {
    surface: ClipsReadout;
    clock: Pick<Clock, 'now'>;
    launch: (slot: unknown) => void;
    remove: (slot: unknown) => void;
  }) {
    this.#surface = surface;
    this.#clock = clock;
    this.#launch = launch;
    this.#remove = remove;
  }
  get tracks(): readonly ClipTrack[] {
    return this.#surface.clipTracks;
  }
  // the clip whose × asks "delete?", or none
  get asking(): unknown {
    return this.#asking?.slot ?? null;
  }
  // A clip track's clips: every holder's in the order held, a clip held twice shown once.
  clipsOn(track: ClipTrack): ShownClip[] {
    const shown = new Map<unknown, ShownClip>();
    for (const { slots, track: on } of track.held) {
      for (const slot of slots.slotsOn(on)) {
        if (!shown.has(slot)) {
          shown.set(slot, this.#shown(slot, track.key, slots.playing(slot)));
        }
      }
    }
    return [...shown.values()];
  }
  launch(slot: unknown): void {
    this.#launch(slot);
  }
  // A clip's ×: asking, or, asked a moment ago, deleting it.
  drop(slot: unknown): void {
    const asking = this.#asking;
    if (!asking || asking.slot !== slot) {
      this.#asking = { slot, at: this.#clock.now() };
      return;
    }
    if (this.#clock.now() - asking.at < TOO_FAST) {
      return;
    }
    this.#asking = null;
    this.#remove(slot);
  }
  stopAsking(): void {
    this.#asking = null;
  }
  // A × left unanswered stops asking.
  expire(): void {
    if (this.#asking && this.#clock.now() - this.#asking.at > ASKS_FOR) {
      this.#asking = null;
    }
  }
  #shown(slot: unknown, track: string, playing: boolean): ShownClip {
    const surface = this.#surface;
    return { slot, name: surface.clipName(slot, track), notes: surface.notesIn(slot, track), playing };
  }
}

// ---------- view/models/transport-lane: the transport as its lane shows it. Pure ----------
// Whether the music plays, and where it is, bar and beat, as a DAW's transport bar shows it.
// Read live, through what's handed in:
//   - the transport, in the lane's own words (Playing);
//   - the clock: its time now, its grid's place for a time, its meter;
//   - the playhead's place, where it's set back, the arrangement's.
// What ▶ and ■ do isn't the model's: its drawer sends them (libs/view/dom/transport-lane-view.ts).
import { barTicks, beatTicks, STEP, type Meter } from '../../clock/index.ts';

// The transport as the lane reads it: whether the music plays.
interface Playing {
  readonly playing: boolean;
}
// The clock as the lane reads it.
interface LaneClock {
  now(): number;
  readonly grid: {
    straightAt(t: number): number;
    meter(): Meter;
  };
}

export class TransportLane {
  readonly #transport: Playing;
  readonly #clock: LaneClock;
  readonly #playhead: () => number | null;

  constructor({ transport, clock, playhead }: { transport: Playing; clock: LaneClock; playhead: () => number | null }) {
    this.#transport = transport;
    this.#clock = clock;
    this.#playhead = playhead;
  }
  get playing(): boolean {
    return this.#transport.playing;
  }
  // Where the music is, bar and beat, or the playhead where it's set back.
  position(): string {
    return positionOf(this.#playhead() ?? this.#now(), this.#clock.grid.meter());
  }
  // where the music is now: the grid's place, its first 16th before it runs
  #now(): number {
    return this.#clock.grid.straightAt(this.#clock.now());
  }
}

// A place, bar and beat, counted from the grid's first 16th, bar 1, as the arrangement's
// ruler numbers them.
function positionOf(place: number, meter: Meter): string {
  const step = Math.max(0, Math.floor(place));
  const perBeat = beatTicks(meter) / STEP;
  const perBar = barTicks(meter) / STEP;
  return `${Math.floor(step / perBar) + 1}.${Math.floor((step % perBar) / perBeat) + 1}`;
}

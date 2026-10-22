// ---------- view/tracks/models/arrangement/time-in-view: what the arrangement's time in view follows ----------
//   - the time in view: following the present, or the playhead while it plays back, until
//     it's scrolled back, and again once it's back at the present or a playback starts (P3b);
//   - the playhead where a press in the ruler puts it, on the nearest beat, until it's let
//     go and cued (P2).
// Its window's span and scroll: TimeWindow's; a press's beat: playheadAt().
import { HISTORY, type GridMap, type Seconds } from '../../../../../sequencing/clock/index.ts';
import { playheadAt } from './playhead.ts';
import { TimeWindow } from './time-window.ts';
import type { ArrangementClock, PlayheadReadout } from '../../readout/index.ts';

export class TimeInView {
  readonly #transport: PlayheadReadout;
  readonly #clock: ArrangementClock;
  readonly #map: Pick<GridMap, 'placeOf' | 'timeOf' | 'stepsPerBeat'>;
  readonly #cue: (t: Seconds | null) => void;
  readonly #window = new TimeWindow();
  #now: Seconds = 0; // the time of the last frame
  #earliest = 0; // the place it scrolls back to at most: the grid's first bar, or where the recording's 30 minutes start
  #playhead: number | null = null; // its place where it's set back, or none, on the present (P2)
  #placing = false; // a press in the ruler, held (P2)
  #playingBack = false; // as the last frame found it: a playback that starts is followed again (P3b)

  constructor({
    transport,
    clock,
    map,
    cue,
  }: {
    transport: PlayheadReadout;
    clock: ArrangementClock;
    map: Pick<GridMap, 'placeOf' | 'timeOf' | 'stepsPerBeat'>;
    cue: (t: Seconds | null) => void;
  }) {
    this.#transport = transport;
    this.#clock = clock;
    this.#map = map;
    this.#cue = cue;
  }
  // the playhead's place where it's set back, or none, on the present (P2)
  get playhead(): number | null {
    return this.#playhead;
  }
  get following(): boolean {
    return this.#window.following;
  }
  get left(): number {
    return this.#window.left;
  }
  get right(): number {
    return this.#window.right;
  }
  get now(): Seconds {
    return this.#now;
  }
  // On every frame while it shows, as much time in view as its drawer has room for:
  //   1. the playhead as the transport has it;
  //   2. the earliest it scrolls back to;
  //   3. a playback that starts followed again;
  //   4. the time in view following the present, or the playhead while it plays back.
  frame(span: number): void {
    this.#now = this.#clock.now();
    this.#followTransport();
    this.#window.setSpan(span);
    this.#earliest = Math.max(0, this.#map.placeOf(this.#now - HISTORY));
    this.#followPlaybackAgain();
    this.#window.follow(this.#followed(), this.#earliest);
  }
  // a press in the ruler: the playhead placed there, until it's let go
  press(place: number): void {
    this.#placing = true;
    this.placeAt(place);
  }
  // the playhead put at a place while the press holds, on the nearest beat; past the present, back on it (P2)
  placeAt(place: number): void {
    if (!this.#placing) {
      return;
    }
    const present = this.#map.placeOf(this.#clock.now());
    this.#playhead = playheadAt(place, { present, perBeat: this.#map.stepsPerBeat(), earliest: this.#earliest });
  }
  // The press let go, in order:
  //   1. cued: the playhead's time, or none, on the present (P3b);
  //   2. a playback it starts or jumps followed again from there.
  // No press, nothing cued.
  release(): void {
    if (!this.#placing) {
      return;
    }
    this.#placing = false;
    this.#cue(this.#playhead === null ? null : this.#map.timeOf(this.#playhead));
    this.#jumped();
  }
  // scrolled by 16ths, more showing what came before: no further than the present, playing back too
  scrollBy(places: number): void {
    this.#window.scrollBy(places, this.#map.placeOf(this.#clock.now()), this.#earliest);
  }
  // the playhead as the transport has it, but while a press in the ruler places it: moving with the playback, or back on the present (P3b)
  #followTransport(): void {
    if (this.#placing) {
      return;
    }
    const at = this.#transport.playhead();
    if (at === null) {
      this.#playhead = null;
    } else if (this.#transport.playingBack) {
      this.#playhead = this.#map.placeOf(at);
    }
  }
  // a playback that starts, by a click in the ruler or by Play, followed again from where its playhead is (P3b)
  #followPlaybackAgain(): void {
    const playingBack = this.#transport.playingBack;
    if (playingBack && !this.#playingBack && this.#playhead !== null) {
      this.#window.followAgain(this.#playhead);
    }
    this.#playingBack = playingBack;
  }
  // and one that jumps, set back while it plays back
  #jumped(): void {
    if (this.#transport.playingBack && this.#playhead !== null) {
      this.#window.followAgain(this.#playhead);
    }
  }
  // what the time in view follows: the playhead while it plays back, else the present (P3b)
  #followed(): number {
    if (this.#transport.playingBack && this.#playhead !== null) {
      return this.#playhead;
    }
    return this.#map.placeOf(this.#now);
  }
}

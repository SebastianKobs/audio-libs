// ---------- build/desk/desk: a desk built and played, as its owner holds it ----------
// A mixing desk (mixing-desk.ts) and its own parts, as a console has them, made with it:
//   - its strips' controls, set on time (strip-controls.ts);
//   - each track's channel, its instrument's way in, what its notes set on it
//     (track-channels.ts).
// Its owner hands in, once: its plan, its setup's rules, the clock and a time on it on what's
// built's.
import type { Clock } from '../../clock/index.ts';
import type { Controller } from '../../midi/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import type { DeskBuilt } from './desk-state.ts';
import { MixingDesk } from './mixing-desk.ts';
import type { DeskSetup } from './setup.ts';
import { StripControls } from './strip-controls.ts';
import { TrackChannels, type ChannelInput } from './track-channels.ts';

// What a desk is made with:
//   - plan: the desk's plan; setup: its rules, which tracks are set live, what a
//     track's notes set;
//   - clock: the clock's time now and its ticks; at(): a time on it on what's built's clock.
export interface DeskMaking {
  readonly plan: Plan;
  readonly setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  readonly clock: Pick<Clock, 'now' | 'onTick'>;
  readonly at: (t: number) => number;
}

export class Desk<B extends DeskBuilt> extends MixingDesk<B> {
  readonly #channels: TrackChannels<B>;
  readonly #controls: StripControls;

  constructor({ plan, setup, clock, at }: DeskMaking) {
    super({ plan });
    this.#channels = new TrackChannels({ desk: this, clock, at, setup });
    this.#controls = new StripControls({ desk: this, channels: this.#channels, clock, at });
  }
  // a strip's controller set on time (strip-controls.ts)
  control(strip: string, controller: Controller): void {
    this.#controls.control(strip, controller);
  }
  // whether a control glides there, as a knob's move is smoothed
  glides(strip: string, controller: string): boolean {
    return this.#controls.glides(strip, controller);
  }
  // whether a track is a strip of the desk's alone: a bus, an FX bus, the master
  isStripTrack(track: string): boolean {
    return this.#controls.isStripTrack(track);
  }
  // where a track's instrument plugs into the desk, as its first note comes; none for a track
  // with no pool
  inputOf(track: string): ChannelInput<B> | null {
    return this.#channels.inputOf(track);
  }
}

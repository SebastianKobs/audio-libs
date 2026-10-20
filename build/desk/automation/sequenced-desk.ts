// ---------- build/desk/automation/sequenced-desk: a desk played from a sequencer, as its owner holds it ----------
// A mixing desk (mixing-desk.ts) and its own parts, as a console has them, made with it:
//   - its strips' controls, set on time (cued-controls.ts);
//   - each track's channel, its instrument's way in, what its notes set on it
//     (libs/build/desk-channels/).
// Its owner hands in, once: its plan, its setup's rules, the clock and a time on it on what's
// built's.
import type { Clock } from '../../../clock/index.ts';
import type { Controller } from '../../../midi/index.ts';
import type { Plan } from '../../../plan/format/index.ts';
import { MixingDesk, type DeskBuilt, type DeskSetup } from '../mixing/index.ts';
import { CuedControls } from './cued-controls.ts';
import { DeskChannels, type ChannelInput } from '../../desk-channels/index.ts';

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

export class SequencedDesk<B extends DeskBuilt> extends MixingDesk<B> {
  readonly #channels: DeskChannels<B>;
  readonly #controls: CuedControls;

  constructor({ plan, setup, clock, at }: DeskMaking) {
    super({ plan });
    this.#channels = new DeskChannels({ desk: this, clock, at, setup });
    this.#controls = new CuedControls({ desk: this, channels: this.#channels, clock, at });
  }
  // a strip's controller set on time (cued-controls.ts)
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

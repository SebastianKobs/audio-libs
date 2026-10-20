// ---------- build/desk/mixing-desk: a desk built, set by address and mixed ----------
// Its state as it plays (desk-state.ts) and its live mix's mute and solo (mix.ts), as a mixing desk has
// them, played by hand or by whatever its owner wires to it:
//   - built by the function handed in, the mute and solo applied as it is;
//   - a track's channel, its pool's copy, added as it's first asked for, the mix applied to it;
//   - a strip muted or soloed, a mute taking along what feeds it.
// No clock and no sequencer: what plays it on time is built on it.
import type { Plan } from '../../../plan/format/index.ts';
import type { Address } from '../../../util/index.ts';
import { DeskState, type DeskBuilt } from './desk-state.ts';
import { Mix } from './mix.ts';

export class MixingDesk<B extends DeskBuilt> extends DeskState<B> {
  readonly #mix: Mix;

  constructor({ plan }: { plan: Plan }) {
    super({ plan });
    this.#mix = new Mix({ desk: this });
  }
  // built as its state is, the mute and solo set before applied
  override build(make: (plan: Plan) => B): B {
    const built = super.build(make);
    this.#mix.apply();
    return built;
  }
  // a track's channel, as its state adds it; the mix applied to it the first time it's added
  override channelOf(track: string): Address | null {
    const before = this.added(track);
    const channel = super.channelOf(track);
    if (channel && !before && this.added(track)) {
      this.#mix.apply();
    }
    return channel;
  }
  // a strip muted, or let go
  mute(strip: string, muted: boolean): void {
    this.#mix.setMute(strip, muted);
  }
  // a strip soloed, or let go
  solo(strip: string, soloed: boolean): void {
    this.#mix.setSolo(strip, soloed);
  }
  // the strips muted and soloed now, copies
  mixState(): { muted: Set<string>; soloed: Set<string> } {
    return this.#mix.state();
  }
}

// ---------- build/ports/built: what every builder hands back ----------
// The thing built from a plan, the desk in the room or the synth on the table, as its front panel:
// its controls and its slots by address, its parts inside, out of reach.
//   - set(): a param set by its address, now, at a time, or gliding there from now; a choice as
//     its param's choices have it;
//   - automate(): a param told its automation, its events' times from a time;
//   - preset(): a preset's values set together, at one time; a setting it changes, a rebuild;
//   - tempo(): a new beat, each synced time following it;
//   - placeholders: what it couldn't build, by address: a block's sound passed straight through,
//     a source silent; said, so it's seen, not only heard missing;
//   - dispose(): taken apart, its sound stopped.
import type { Automation, When } from '../../automation/index.ts';
import type { Address, ValuesByAddress } from '../../plan/format/index.ts';

// what's built
export interface Built {
  set(address: Address, value: number | string, when?: When): void;
  automate(address: Address, automation: readonly Automation[], from?: number): void;
  preset(values: ValuesByAddress, settings?: ValuesByAddress, when?: When): void;
  tempo(beat: number, when?: When): void;
  readonly placeholders: readonly Address[];
  dispose(): void;
}

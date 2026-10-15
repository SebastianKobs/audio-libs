// ---------- build/ports/built: what every builder hands back ----------
// The thing built from a plan, the desk in the room or the synth on the table, as its front panel:
// its controls and its slots by address, its parts inside, out of reach.
//   - placeholders: what it couldn't build, by address: a block's sound passed straight through,
//     a source silent; said, so it's seen, not only heard missing;
//   - dispose(): taken apart, its sound stopped.
import type { Address } from '../../plan/format/index.ts';

// what's built
export interface Built {
  readonly placeholders: readonly Address[];
  dispose(): void;
}

// ---------- build/desk/mixing/setup: a setup of the desk, as its machinery takes it ----------
// The machinery here knows no setup's names: a setup hands in its rules, and its owner wires
// them. The desk itself is planned from the setup's own, a studio's YAML.
// What a setup hands in, each by a strip's name or a param's address:
//   1. isLive(): whether a track's channel is set live, in the session view, or by its
//      notes;
//   2. setBy(): what sets a param on a track's channel by its notes, in words a view shows
//      (distance, dry); none where its notes don't set it.
// What a slot does and how its params are set is worked out from these and the plan.
import type { Address } from '../../../util/index.ts';

// A desk's setup: its rules.
// Its hooks are functions, not methods: handed on as they are, they need no this.
export interface DeskSetup {
  readonly isLive: (track: string) => boolean;
  readonly setBy: (address: Address) => string | undefined;
}

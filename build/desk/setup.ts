// ---------- build/desk/setup: a setup of the desk, as its machinery takes it ----------
// The machinery here knows no setup's names: a setup hands in its rules, and its owner wires
// them. The desk itself is planned from the setup's own, a studio's YAML.
// What a setup hands in, each by a strip's name:
//   1. mutedWith(): the strips muted, with those a mute takes along;
//   2. isLive(): whether a track's channel is set live, in the session view, or by its
//      notes;
//   3. setByNotes(): whether a track's notes set a param on its channel, by its address;
//   4. roleOf(): what a slot does on a strip, and how its params are set, as the views show
//      it, the desk's own slots among them.
import type { Address } from '../../plan/format/index.ts';

// What a slot does on its strip, and how its params are set, as the strip's owner says:
//   - job: what it does there;
//   - setBy: what its slot in the session view says sets it; none for one set live;
//   - by: live, the desk's own, set here; or automated by its notes;
//   - source: by what, where its notes set it;
//   - sets: the params set so, by their addresses in the slot; every one unless it says. The
//     others fixed as built.
export interface SlotRole {
  readonly job: string;
  readonly setBy?: string;
  readonly by: 'live' | 'automated';
  readonly source?: string;
  readonly sets?: readonly string[];
}

// A desk's setup: its rules.
// Its hooks are functions, not methods: handed on as they are, they need no this.
export interface DeskSetup {
  readonly mutedWith: (muted: ReadonlySet<string>, strips: readonly string[]) => Set<string>;
  readonly isLive: (track: string) => boolean;
  readonly setByNotes: (address: Address) => boolean;
  readonly roleOf: (strip: string, slot: string) => SlotRole | undefined;
}

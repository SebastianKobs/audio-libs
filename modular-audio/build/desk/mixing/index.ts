// ---------- build/desk: a desk built, set by address and mixed ----------
// What a desk does as it plays, on what any builder hands back, no clock and no sequencer:
//   - mixing-desk.ts: the desk built, its values set by address and kept, its live mix's mute and solo, a way into each track's channel;
//   - desk-state.ts: its plan, built by the function handed in, every value set by its address
//     and kept, a track's channel its pool's copy, added as it's first asked for;
//   - mix.ts: the live mix's mute and solo, a mute taking along what feeds it;
//   - setup.ts: what a setup hands in, its rules, by a strip's name;
export { MixingDesk, type ChannelInput } from './mixing-desk.ts';
export type { DeskBuilt, WayIn } from './desk-state.ts';
export type { DeskSetup } from './setup.ts';

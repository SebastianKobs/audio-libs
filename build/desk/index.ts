// ---------- build/desk: a desk built and played by address ----------
// What a desk does as it plays, on what any builder hands back, beyond it its ways in:
//   - desk.ts: the desk as its owner holds it, its state and its own parts, made with it;
//   - desk-state.ts: its plan, built by the function handed in, every value set by its address
//     and kept, a track's channel its pool's copy, added as it's first asked for;
//   - strip-controls.ts: a strip's controller set on the desk on time, held on the clock's cues,
//     a track's channel's where its notes set it, a strip's mute and solo the live mix's;
//   - track-channels.ts: each track's channel, its instrument's way in, what its notes set on it;
//   - mix.ts: the live mix's mute and solo, a mute taking along what its setup says;
//   - setup.ts: what a setup hands in, its rules, by a strip's name;
//   - desk-surface.ts: the desk's own control surface, a strip's control moved by hand played
//     into a sequencer as a controller; a desk's edit by address, as the app's message.
export { Desk } from './desk.ts';
export { DeskSurface, type DeskMessage } from './desk-surface.ts';
export type { DeskBuilt, WayIn } from './desk-state.ts';
export type { DeskSetup } from './setup.ts';

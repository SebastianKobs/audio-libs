// ---------- build/desk/automation: the desk's automation, a package fitted to a desk ----------
// What plays a mixing desk (libs/build/desk/mixing/) on time, on the clock, as a copy of whoever
// operates it; the desk works without it:
//   - desk-automation.ts: a strip's controller set on the desk on time, held on the clock's cues,
//     a track's channel's where its notes set it, a strip's mute and solo the live mix's;
//   - change.ts: a change to a param by its address, and when it lands on what's built's clock;
//   - desk-surface.ts: the desk's own control surface, a strip's control moved by hand played
//     into a sequencer as a controller; a desk's edit by address played in.
export { DeskAutomation } from './desk-automation.ts';
export { whenOf, type Change } from './change.ts';
export { DeskSurface } from './desk-surface.ts';

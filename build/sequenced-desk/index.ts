// ---------- build/sequenced-desk: a desk played from a sequencer ----------
// A mixing desk (libs/build/desk/) and what plays it on time, on the clock:
//   - sequenced-desk.ts: the desk as its owner holds it, its parts made with it;
//   - cued-controls.ts: a strip's controller set on the desk on time, held on the clock's cues,
//     a track's channel's where its notes set it, a strip's mute and solo the live mix's;
//   - track-channels.ts: each track's channel, its instrument's way in, what its notes set on it;
//   - desk-surface.ts: the desk's own control surface, a strip's control moved by hand played
//     into a sequencer as a controller; a desk's edit by address played in.
export { SequencedDesk } from './sequenced-desk.ts';
export { DeskSurface } from './desk-surface.ts';

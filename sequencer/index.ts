// ---------- libs/sequencer: events sequenced on a beat grid, any events: patterns, clips looping on tracks, plays allotted to tracks ----------
// After Ableton's session view (mockup/architecture/sequencer.md). A pattern is like a clip: { meter, bars, loop, events }, its time
// signature (the master's when it's left out), its length in bars, whether it loops or plays once when triggered, and its events, each
// { start, duration, … }: where it starts and how long it lasts, in ticks (PPQ to a quarter), on the straight grid, whatever else it
// carries passed on and never read. Played once (place()) or repeating (due()), whole, or live at a speed; clips of them launched on
// tracks, one a track, each event handed on as its 16th comes (ClipLauncher); plays allotted to tracks as a polysynth allots its voices
// (TrackPool). On the clock alone; the MIDI sequencer, notes and their messages, is on top of it (libs/midi-sequencer/)
export { PPQ, STEP, MASTER, barTicks, startsBar, lengthOf, patternOf } from './pattern.ts';
export type { Ticks, Pattern, PatternEvent } from './pattern.ts';
export { upcoming, whole, due, liveEvents, underWayAt, rescaled, place, placeOn } from './playing.ts';
export type { Grid } from './playing.ts';
export { ClipLauncher } from './launcher.ts';
export type { ClipGrid, LaunchedClip, PlayEvent } from './launcher.ts';
export { TrackPool } from './track-pool.ts';
export type { Meter } from '../clock/index.ts';

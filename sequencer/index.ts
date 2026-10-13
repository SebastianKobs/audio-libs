// ---------- libs/sequencer: events of any kind, sequenced on a beat grid ----------
// Modelled on Ableton's session view. Runs on the clock alone.
// The MIDI sequencer (notes and their messages) sits on top of it: libs/midi-sequencer/.
// Patterns: like a clip, { meter, bars, loop, events }.
//   - meter: the time signature; the master's when left out.
//   - bars: the pattern's length. loop: repeats, or plays once when triggered.
//   - events: { start, duration, … } in ticks (PPQ to a quarter), on the straight grid.
//     Anything else an event carries is passed on, never read.
// Playing: once (place()) or repeating (due()), whole, or live at a speed.
// Clips: launched on tracks, one clip a track; each event handed on as its 16th comes
// (ClipLauncher).
// Track pools: overlapping plays shared out over tracks, as a polysynth shares its voices
// (TrackPool); how long the plays on a track hold it (Holding).
export { PPQ, STEP, MASTER, barTicks, startsBar, lengthOf, patternOf } from './pattern.ts';
export type { Ticks, Pattern, PatternEvent } from './pattern.ts';
export { upcoming, whole, due, liveEvents, underWayAt, rescaled, place, placeOn } from './playing.ts';
export type { Grid } from './playing.ts';
export { ClipLauncher } from './launcher.ts';
export type { ClipGrid, LaunchedClip, PlayEvent } from './launcher.ts';
export { TrackPool } from './track-pool.ts';
export { Holding } from './holding.ts';
export type { Meter } from '../clock/index.ts';

// ---------- libs/sequencer: tracks of patterns, played on the grid. Pure: no Web Audio, nothing of the garden's ----------
// After Ableton's session view (mockup/architecture/sequencer.md). A pattern is like a clip: { meter, bars, loop, events }, its time
// signature (the master's when it's left out), its length in bars, whether it loops or plays once when triggered, and its events, each
// { start, duration, … }: where it starts and how long it lasts, in ticks (PPQ to a quarter), on the straight grid. A rest isn't stored: it's
// the gap between notes. A pattern starts on the one of its first bar, so nothing comes before 0: an upbeat is written where it falls,
// in a loop at the end of its last bar. Played once (place()) or repeating (due());
// a track is endless and plays one pattern at a time. What's played into a track is kept as its record, the garden's (keep()). A record
// is a pattern too (patternOf()), looping where it was played, as many whole cycles long as it needs; a replay plays a run of it or a
// slice, reshaped, the garden's, placed on the grid (place()), as a vine's does. Everything played,
// the garden's and your own as you play it, goes through its sequencer's stream (onPlay(), L1b), for whoever listens: a session view, a
// recorder. rand() and the clock's grid (stepAt, timeAt) are given, so it runs anywhere and draws what it's given in a fixed order.
// A control surface plays into it (input.ts, G0): a track's messages (messages.ts), each note a fresh index (rotation.ts), passed on to
// its instrument at once, which it alone plays, and into the stream; and back to whoever listens, the surface lighting it (G0e).
// Its parts: a pattern (pattern.ts), a pattern played (playing.ts), the stream (stream.ts), the messages (messages.ts), a note's index
// (rotation.ts), the input (input.ts); the replay tracks (tracks.ts). Speed and feel, a contour walked, a record kept and sliced and a
// pattern reshaped are the garden's (garden-surface/phrasing/), what a session view shows of the stream its own (session.ts), since L1a
export { PPQ, STEP, MASTER, barTicks, startsBar, lengthOf, patternOf } from './pattern.ts';
export type { Ticks, PatternNote, Pattern } from './pattern.ts';
export { upcoming, whole, due, liveNotes, soundingAt, rescaled, place, placeOn } from './playing.ts';
export type { Grid } from './playing.ts';
export { Stream } from './stream.ts';
export type { NoteEnd, NoteGlide, Play, PlayedNote, PlayListener } from './stream.ts';
export { notesIn } from './messages.ts';
export type {
  Controller,
  Message,
  NoteOn,
  NoteOff,
  PerNoteController,
  PerNoteControllerName,
  PerNoteManagement,
  PerNoteValues,
  SentNote,
} from './messages.ts';
export { NoteRotation } from './rotation.ts';
export { Sequencer } from './input.ts';
export { ClipPlayer } from './clips.ts';
export { Recorder } from './recorder.ts';
export { RecordingPlayer } from './playback.ts';
export { ReplayTracks } from './tracks.ts';
export type { PlayedFrom, TimeMap } from '../timeline/index.ts';
export type { Lane, Region } from './recorder.ts';
export type { Clip, ClipGrid } from './clips.ts';
export type { Address, Instrument, Input, NoteListener, NoteOffListener } from './input.ts';
export type { Meter } from '../clock/index.ts';

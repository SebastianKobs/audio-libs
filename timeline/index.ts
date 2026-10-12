// ---------- libs/timeline: what happened, laid out in time, events of any kind, a package of its own (L1c) ----------
// The generic part of an arrangement, as Premiere's or Ableton's: regions of events, an element's by their number, an event held open
// until its end comes, lanes of points, each a jump or a glide, kept for a window of time (timeline/README.md). The sequencer's recorder
// is the music's mapping onto it (sound/sequencer/recorder.ts)
export { EventRecorder, type Carry, type RecorderOptions, type Region, type TimedEvent } from './recorder.ts';
export { lastValueAt, valueAt, type EventLanes, type Lane, type LanePoint } from './lanes.ts';

// ---------- libs/timeline: what happened, laid out in time, events of any kind, a package of its own (L1c, L1c2) ----------
// Events, each with its extent, its own length, open until it's ended, or until the next of its key, kept for a window of time, what's in
// effect kept (timeline/README.md). Nothing of what they are: the sequencer's regions and lanes are its own views of them (sound/sequencer/)
export { Timeline, placed, thinned, type TimedEvent, type TimelineOptions } from './timeline.ts';

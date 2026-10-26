// ---------- libs/modular-audio/view/tracks/readout: the session view's and the arrangement's jacks, what their models read ----------
// Each a readout, read by the views' models when they want, but the arrangement's clock, which
// tells each 16th too; what's done goes out on a bus. Its parts: see README.md.
export type { ClipsReadout, ClipTrack } from './clips.ts';
export type {
  ArrangementClock,
  DeclaredReadout,
  PlayheadReadout,
  RecordedLane,
  RecordedNote,
  RecordedRegion,
  RecordingReadout,
  TrackGroup,
  TracksReadout,
} from './arrangement.ts';

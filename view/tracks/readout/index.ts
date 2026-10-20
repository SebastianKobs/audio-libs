// ---------- libs/view/tracks/readout: the session view's and the arrangement's jacks, what their models read ----------
// Each a readout, read by the views' models when they want, but the arrangement's clock, which
// tells each 16th too; what's done goes out on the app's bus. Its parts:
//   - clips.ts: the clip slots, as a view's clip tracks read them, a clip player's and a
//     control surface's (ClipsReadout);
//   - arrangement.ts: what the arrangement reads, in its own words, the recording, the tracks,
//     the playhead, what the desk declares, the clock; the session's tracks read the tracks too.
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

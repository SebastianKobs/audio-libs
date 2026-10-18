// ---------- libs/view/control-surface: the views' jacks, what their models read ----------
// Each a readout, read by the views' models when they want, but the arrangement's clock, which
// tells each 16th too; what's done goes out on the app's bus. Its parts:
//   - plan.ts: a plan's readout, by address (PlanReadout), how a value is set (Role), what a
//     device does in its slot (Slot), what's done (Command);
//   - desk.ts: a desk's readout, as it plays (deskReadout()); what's done on it as its message
//     (deskEdited());
//   - preset.ts: a preset's readout, on its plan (PresetReadout);
//   - clips.ts: the clip slots, as a view's clip tracks read them, a clip player's and a
//     control surface's (ClipsReadout);
//   - arrangement.ts: what the arrangement reads, in its own words, the recording, the tracks,
//     the playhead, what the desk declares, the clock; the session's tracks read the tracks too;
//   - instruments.ts: the instruments as the device view reads them, the patch each role plays,
//     a role's cards (InstrumentsReadout).
export type { Command, PlanReadout, Role, Slot } from './plan.ts';
export { deskEdited, deskReadout } from './desk.ts';
export { PresetReadout } from './preset.ts';
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
export type { InstrumentCard, InstrumentsReadout } from './instruments.ts';

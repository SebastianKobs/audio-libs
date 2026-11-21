// ---------- modular-audio/view/tracks/models: the session view's and the arrangement's view models, no DOM ----------
// Handed what it reads through its readout (modular-audio/view/tracks/readout/) and the desk's
// view models (modular-audio/view/desk/models/), hands back what a view shows and what it can do.
// Its parts: see README.md.
export { ClipTracks, type ShownClip } from './clip-tracks.ts';
export { Session, type GroupShown, type TrackShown } from './session.ts';
export { SessionTracks } from './session-tracks.ts';
export { Views, type ViewName } from './views.ts';
export { Arrangement } from './arrangement/arrangement.ts';
export type { PlacedLane, PlacedRegion } from './arrangement/regions.ts';
export { declaredBy } from './arrangement/declared.ts';
export { laneLine, type Corner } from './arrangement/lane-shapes.ts';
export { noteShape, pitchRange, type NoteShape } from './arrangement/note-shapes.ts';
export type { ArrangedStrip, Row, SectionLabels } from './arrangement/rows.ts';

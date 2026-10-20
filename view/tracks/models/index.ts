// ---------- libs/view/tracks/models: the session view's and the arrangement's view models, no DOM ----------
// Handed a plan and its values through the plan's readout (libs/view/device/readout/), hands back
// what a view shows and what it can do.
// Its parts:
//   - clip-tracks.ts: the clip tracks, each clip read from what holds it, a clip player or the
//     control surface, its ▶, and its × asking first;
//   - placed.ts: where a play goes, its group and its track, the session's and the arrangement's;
//   - session.ts: what the session view shows of what's played, each track of a group and
//     what holds it, lit as it sounds, in its own words;
//   - session-tracks.ts: the session's tracks as its mixer shows them, in the control
//     surface's groups, and what sounded since the last look;
//   - views.ts: the session view and the arrangement, which one is open;
//   - arrangement/: what was heard laid out in time, its rows, regions and lanes, the time in
//     view and the playhead, in 16ths; what it reads in its own words (libs/view/tracks/readout/); a region's notes'
//     and a lane's shapes, as they're drawn; what the desk declares, read from its view models.
export { ClipTracks, type ShownClip } from './clip-tracks.ts';
export { Session, type GroupShown, type TrackShown } from './session.ts';
export { SessionTracks } from './session-tracks.ts';
export { Views, type ViewName } from './views.ts';
export { Arrangement } from './arrangement/arrangement.ts';
export type { PlacedLane, PlacedRegion } from './arrangement/regions.ts';
export { declaredBy } from './arrangement/declared.ts';
export { laneLine, type Corner } from './arrangement/lane-shapes.ts';
export { noteShape, pitchRange, type NoteShape } from './arrangement/note-shapes.ts';
export type { Row, SectionLabels } from './arrangement/rows.ts';

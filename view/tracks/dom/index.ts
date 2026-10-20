// ---------- libs/view/tracks/dom: the session view and the arrangement drawn in the DOM ----------
// One implementation of the views, as Web Audio is of the sound.
// Its parts:
//   - clip-tracks-view.ts: the clip tracks drawn, a column each, a chip a clip, lit while it
//     sounds, its ▶ and its × handed to its model;
//   - session-drawing.ts: when the session view is drawn: on a beat, from a beat back as it's
//     shown, a beat after the last while playing back, held under a pressed pointer;
//   - view-strip.ts: the strip along the bottom, the session view and the arrangement, drawn
//     from which one is open;
//   - arrangement/: the arrangement on the page, its names beside its time, drawn on canvases,
//     its ruler, rows, regions and their notes, lanes, the present and the playhead; a click,
//     a drag and a wheel handed to its model.
export { ClipTracksView, type ClipHints } from './clip-tracks-view.ts';
export {
  ArrangementView,
  type ArrangementColors,
  type Drawn as ArrangementDrawn,
} from './arrangement/arrangement-view.ts';
export { SessionDrawing } from './session-drawing.ts';
export { ViewStrip } from './view-strip.ts';

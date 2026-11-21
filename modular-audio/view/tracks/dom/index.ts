// ---------- modular-audio/view/tracks/dom: the session view and the arrangement drawn in the DOM ----------
// One implementation of the views, as Web Audio is of the sound.
// Its parts: see README.md.
export { ClipTracksView, type ClipHints } from './clip-tracks-view.ts';
export {
  ArrangementView,
  type ArrangementColors,
  type Drawn as ArrangementDrawn,
} from './arrangement/arrangement-view.ts';
export { SessionDrawing } from './session-drawing.ts';
export { ViewStrip } from './view-strip.ts';

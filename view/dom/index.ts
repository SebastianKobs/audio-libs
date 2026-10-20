// ---------- libs/view/dom: the view models drawn in the DOM ----------
// One implementation of the views, as Web Audio is of the sound.
// Its parts:
//   - strip-view.ts: a strip drawn, its slots, its mute and solo;
//   - section-view.ts: a section of a view, its strips in a row, folding, its light;
//   - mixer-view.ts: a mixer drawn, its strips side by side in its sections, the groups of
//     tracks it's handed, its level bars and its lights;
//   - clip-tracks-view.ts: the clip tracks drawn, a column each, a chip a clip, lit while it
//     sounds, its ▶ and its × handed to its model;
//   - instrument-devices.ts: each role's instrument a device, a rack of its cards, the test
//     note's button held as long as it is, its reset; its words and the test note's row its
//     owner's;
//   - insert-devices.ts: a strip's inserts, each a composite drawn flat, a reset for what's live;
//   - transport-lane-view.ts: the transport's lane drawn, ▶ and ■ sent, bar and beat;
//   - session-drawing.ts: when the session view is drawn: on a beat, from a beat back as it's
//     shown, a beat after the last while playing back, held under a pressed pointer;
//   - view-strip.ts: the strip along the bottom, the session view and the arrangement, drawn
//     from which one is open;
//   - arrangement/: the arrangement on the page, its names beside its time, drawn on canvases,
//     its ruler, rows, regions and their notes, lanes, the present and the playhead; a click,
//     a drag and a wheel handed to its model.
export { muteSoloHtml, slotsHtml, stripHtml, type StripLook } from './strip-view.ts';
export { SectionView } from './section-view.ts';
export { ClipTracksView } from './clip-tracks-view.ts';
export { deskHtml, fedBy, MixerView, trackHtml, type MixerLook } from './mixer-view.ts';
export {
  ArrangementView,
  type ArrangementColors,
  type Drawn as ArrangementDrawn,
} from './arrangement/arrangement-view.ts';
export { InsertDevices } from './insert-devices.ts';
export { InstrumentDevices, type InstrumentLook } from './instrument-devices.ts';
export { TransportLaneView, type TransportHints } from './transport-lane-view.ts';
export { SessionDrawing } from './session-drawing.ts';
export { ViewStrip } from './view-strip.ts';

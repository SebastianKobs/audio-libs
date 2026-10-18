// ---------- libs/view/dom: the view models drawn in the DOM ----------
// One implementation of the views, as Web Audio is of the sound.
// Its parts:
//   - elements.ts: an element made, and HTML made by html``, every value escaped;
//   - knob-view.ts: a knob and a fader drawn, dragged and set back, brought up to date;
//   - device-view.ts: a device drawn, its status, its reset, its controls;
//   - group-view.ts: a group of a composite's children drawn, a tab each, the chosen one's controls;
//   - envelope-view.ts: an envelope's curve drawn, its delay's end and the note's marked;
//   - matrix-view.ts: a matrix drawn, a row a source and what it moves, how much;
//   - choice-view.ts: a choice drawn as a list of its options, and a switch;
//   - meter-view.ts: a level bar, its fall, and where a level shows on it;
//   - limiter-view.ts: the limiter's view of its own, its history and what it takes away;
//   - strip-view.ts: a strip drawn, its slots, its mute and solo;
//   - section-view.ts: a section of a view, its strips in a row, folding, its light;
//   - mixer-view.ts: a mixer drawn, its strips side by side in its sections, the groups of
//     tracks it's handed, its level bars and its lights;
//   - canvas.ts: a canvas sized for the screen's pixels;
//   - arrangement/: the arrangement on the page, its names beside its time, drawn on canvases,
//     its ruler, rows, regions and their notes, lanes, the present and the playhead; a click,
//     a drag and a wheel handed to its model.
export { appendHtml, Html, html, makeElement, setHtml } from './elements.ts';
export { choiceHtml, switchHtml } from './choice-view.ts';
export { controlsHtml, deviceHtml, type DeviceLook } from './device-view.ts';
export { envelopeHtml } from './envelope-view.ts';
export { groupHtml, type Group, type GroupLook } from './group-view.ts';
export { matrixHtml } from './matrix-view.ts';
export { faderHtml, KnobDrag, knobHtml, refreshKnobs, stillPanHtml } from './knob-view.ts';
export { LimiterView, type LimiterLook } from './limiter-view.ts';
export { Levels, meterFall, meterHtml, meterPosition } from './meter-view.ts';
export { muteSoloHtml, slotsHtml, stripHtml, type StripLook } from './strip-view.ts';
export { SectionView } from './section-view.ts';
export {
  deskHtml,
  fedBy,
  MixerView,
  trackHtml,
  type MixerGroup,
  type MixerLook,
  type MixerTrack,
} from './mixer-view.ts';
export {
  ArrangementView,
  type ArrangementColors,
  type Drawn as ArrangementDrawn,
} from './arrangement/arrangement-view.ts';

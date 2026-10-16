// ---------- libs/view/dom: the view models drawn in the DOM ----------
// One implementation of the views, as Web Audio is of the sound.
// Its parts:
//   - elements.ts: an element made, and HTML made by html``, every value escaped;
//   - knob-view.ts: a knob and a fader drawn, dragged and set back, brought up to date;
//   - device-view.ts: a device drawn, its status, its reset, its knobs;
//   - meter-view.ts: a level bar, its fall, and where a level shows on it;
//   - strip-view.ts: a strip drawn, its slots, its mute and solo.
export { appendHtml, Html, html, makeElement, setHtml } from './elements.ts';
export { deviceHtml, type DeviceLook } from './device-view.ts';
export { faderHtml, KnobDrag, knobHtml, refreshKnobs, stillPanHtml } from './knob-view.ts';
export { meterFall, meterHtml, meterPosition } from './meter-view.ts';
export { muteSoloHtml, slotsHtml, stripHtml, type StripLook } from './strip-view.ts';

// ---------- libs/view/device/dom: a plan's devices drawn in the DOM ----------
// Drawn from the device models, on the views' HTML (libs/view/html/).
// Its parts:
//   - bound.ts: drawn elements bound to their models as they're drawn, found by the element;
//   - hint.ts: a control's hint, one wording for every view;
//   - custom-view.ts: a view of its own, the contract every one meets;
//   - knob-view.ts: a knob and a fader drawn, dragged and set back, brought up to date;
//   - device-view.ts: a device drawn, its status, its reset, its controls;
//   - group-view.ts: a group of a composite's children drawn, a tab each, the chosen one's controls;
//   - composite-view.ts: a composite drawn, an instrument's and a strip's alike, flat or with a
//     face, a rack of them a pad each; its chosen pads and tabs, its resets;
//   - envelope-view.ts: an envelope's curve drawn, its delay's end and the note's marked; a
//     device's view of its own, redrawn as its knobs set it;
//   - matrix-view.ts: a matrix drawn, a row a source and what it moves, how much;
//   - choice-view.ts: a choice drawn as a list of its options, and a switch;
//   - meter-view.ts: a level bar, its fall, and where a level shows on it;
//   - limiter-view.ts: the limiter's view of its own, its history and what it takes away;
//   - device-panel-view.ts: the device view drawn below the tracks from its model, what's open,
//     each kind a chain of devices filling it, its knobs dragged and brought up to date.
export { Bound, CONTROL_MARKS } from './bound.ts';
export { controlHint } from './hint.ts';
export { choiceHtml, switchHtml } from './choice-view.ts';
export { controlsHtml, deviceHtml, type DeviceLook } from './device-view.ts';
export { EnvelopeView, envelopeHtml } from './envelope-view.ts';
export type { CustomView } from './custom-view.ts';
export { groupHtml, type Group, type GroupLook } from './group-view.ts';
export { CompositeView, type Composite, type CompositeLook, type Rack } from './composite-view.ts';
export { matrixHtml } from './matrix-view.ts';
export { EMPTY, faderHtml, KnobDrag, knobHtml, refreshKnobs, stillPanHtml } from './knob-view.ts';
export { LimiterView, type LimiterLook } from './limiter-view.ts';
export { meterHtml, meterPosition } from './meter-view.ts';
export { DevicePanelView, type DeviceChain } from './device-panel-view.ts';

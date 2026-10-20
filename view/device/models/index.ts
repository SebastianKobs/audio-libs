// ---------- libs/view/device/models: a plan's devices as view models, no DOM ----------
// Handed a plan and its values through the plan's readout (libs/view/device/readout/), hands back
// what a device view shows and what it can do.
// Its parts:
//   - model.ts: the plan and its values by address, read through the plan's readout;
//   - view-builder.ts: view models for whatever part of a plan is asked;
//   - knob.ts: a param with a range as a control, its text as shown;
//   - choice.ts: a param or a setting with choices;
//   - device.ts: a node as a device, its controls in order, what every control has;
//   - envelope.ts: an envelope's curve from its knobs, as a view draws it, the curve played;
//   - custom-views.ts: a view of its own, registered by kind;
//   - meters.ts: a level bar's fall, as a DIN peak meter's;
//   - limiter-history.ts: the limiter's history, a column each interval, the loudest of its frames;
//   - chosen.ts: what's chosen in the composites a view shows, a rack's pad, a group's tab;
//   - device-panel.ts: the device view, what's open in it, by a kind and what of it, its chain.
export { Choice } from './choice.ts';
export { DevicePanel, type Opened } from './device-panel.ts';
export { Chosen } from './chosen.ts';
export { meterFall, Meters } from './meters.ts';
export { LimiterHistory, type Peaks } from './limiter-history.ts';
export { CustomViews } from './custom-views.ts';
export { Control, type Device } from './device.ts';
export { envelopeDrawing, type EnvelopeDrawing } from './envelope.ts';
export { Knob, textOf, type Ring } from './knob.ts';
export { ViewBuilder, type MatrixRow } from './view-builder.ts';

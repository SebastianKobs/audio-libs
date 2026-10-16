// ---------- libs/view/models: view models built from a plan, no DOM ----------
// Handed a plan and its values through a port, hands back what a view shows and what it can do.
// Its parts:
//   - model.ts: the plan and its values by address, read through the tool's port;
//   - view-builder.ts: view models for whatever part of a plan is asked;
//   - knob.ts: a param with a range as a control, its text as shown;
//   - choice.ts: a param or a setting with choices;
//   - device.ts: a node as a device, its controls in order, what every control has;
//   - strip.ts: a channel as a strip, by its form, its name as shown;
//   - mixer.ts: a desk as a mixer, its strips by role, a solo click;
//   - command.ts: what's done in a view, by address;
//   - custom.ts: a view of its own, registered by kind.
export { Choice } from './choice.ts';
export type { Command } from './command.ts';
export { CustomViews } from './custom.ts';
export { Control, type Device } from './device.ts';
export { Knob, textOf } from './knob.ts';
export { Mixer, type BusGroup } from './mixer.ts';
export type { ModelPort, Role, Slot } from './model.ts';
export { Strip, shortName, shownName } from './strip.ts';
export { ViewBuilder } from './view-builder.ts';

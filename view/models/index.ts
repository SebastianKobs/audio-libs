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
//   - moves.ts: what moves each param, a macro's maps and a child wired into it, as a mod matrix;
//   - envelope.ts: an envelope's curve from its knobs, as a view draws it, the curve played;
//   - preset-port.ts: a port for a plan whose values a preset gives, a patch's on its voice card;
//   - cards.ts: an instrument's patches as the device view edits them, a port each, the patch
//     edited in the bank;
//   - desk-port.ts: a port for a desk as it plays (libs/build/desk/), its meters, its mix;
//   - command.ts: what's done in a view, by address;
//   - custom.ts: a view of its own, registered by kind.
export { Choice } from './choice.ts';
export type { Command } from './command.ts';
export { CustomViews } from './custom.ts';
export { Control, type Device } from './device.ts';
export { envelopeDrawing, type EnvelopeDrawing } from './envelope.ts';
export { Knob, textOf, type Ring } from './knob.ts';
export { Mixer, type BusGroup } from './mixer.ts';
export type { ModelPort, Role, Slot } from './model.ts';
export type { Move } from './moves.ts';
export { PresetPort, type PresetOwner } from './preset-port.ts';
export { InstrumentCards, type CardValues, type InstrumentCard } from './cards.ts';
export { deskPort } from './desk-port.ts';
export { Strip, shortName, shownName } from './strip.ts';
export { ViewBuilder, type MatrixRow } from './view-builder.ts';

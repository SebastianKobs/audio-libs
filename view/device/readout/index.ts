// ---------- libs/view/device/readout: what a device view reads of a plan, and what it sends ----------
// Each a readout, read by the models when they want; what's done goes out on the app's bus. Its parts:
//   - plan.ts: a plan's readout, by address (PlanReadout), how a value is set (Role), what a
//     device does in its slot (Slot), what's done (Command);
//   - preset.ts: a preset's readout, on its plan (PresetReadout).
export type { Command, PlanReadout, Role, Slot } from './plan.ts';
export { PresetReadout } from './preset.ts';

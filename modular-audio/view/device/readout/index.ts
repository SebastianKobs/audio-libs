// ---------- modular-audio/view/device/readout: what a device view reads of a plan, and what it sends ----------
// Each a readout, read by the models when they want; what's done goes out on a bus.
// Its parts: see README.md.
export type { Command, PlanReadout, Role, Slot } from './plan.ts';
export { PresetReadout } from './preset.ts';

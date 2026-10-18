// ---------- libs/view/control-surface: the views' jacks, what their models read ----------
// Each an in, read by the views' models; what's done goes out on the app's bus. Its parts:
//   - plan.ts: a plan's in, by address (PlanIn), how a value is set (Role), what a device does
//     in its slot (Slot), what's done (Command);
//   - desk.ts: a desk's in, as it plays (deskIn()); what's done on it as its message
//     (deskEdited());
//   - preset.ts: a preset's in, on its plan (PresetIn);
//   - clips.ts: the clip slots, as a view's clip tracks read them, a clip player's and a
//     control surface's (ClipsIn).
export type { Command, PlanIn, Role, Slot } from './plan.ts';
export { deskEdited, deskIn } from './desk.ts';
export { PresetIn } from './preset.ts';
export type { ClipsIn, ClipTrack } from './clips.ts';

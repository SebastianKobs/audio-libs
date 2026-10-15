// ---------- audio-plan: an audio graph as data, its automation, and a sounding one following an edit ----------
// Its parts:
//   - plan.ts: the plan, its nodes, edges and input, a param's automation, what a sounding
//     one is told, a source's last stop;
//   - automation.ts: a param's level at a time, as Web Audio plays its automation, an
//     event's time, a param restarted;
//   - edit.ts: an edit followed while it sounds, a held value glided by the smoothing; a
//     lasting graph glided to an edit from where it plays; and a fade through one of its
//     gains, as a rebuild crossfades.
export type { AudioPlan, Automation, BufferSpec, Edge, NodeKind, Operation, PlanNode } from './plan.ts';
export { eventTime, levelAt, restartAt } from './automation.ts';
export { lastStop } from './plan.ts';
export { SMOOTHING, fadeInThrough, fadeOutThrough, followEdit, glideEdit } from './edit.ts';

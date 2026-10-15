// ---------- audio-plan: an audio graph as data, its automation, and a sounding one following an edit ----------
// Its parts:
//   - plan.ts: the plan, its nodes, edges and input, what a sounding one is told, a
//     source's last stop; a param's automation is libs/automation/'s;
//   - edit.ts: an edit followed while it sounds, a held value glided by the smoothing; a
//     lasting graph glided to an edit from where it plays; and a fade through one of its
//     gains, as a rebuild crossfades.
export type { AudioPlan, BufferSpec, Edge, NodeKind, Operation, PlanNode } from './plan.ts';
export { lastStop } from './plan.ts';
export { SMOOTHING, fadeInThrough, fadeOutThrough, followEdit, glideEdit } from './edit.ts';

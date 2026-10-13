// ---------- audio-plan: an audio graph as data, its automation, and a sounding one following an edit ----------
// Its parts: the plan, its nodes, edges and input, a param's automation, what a sounding one is told (plan.ts); a param's level at a
// time, as Web Audio plays its automation (automation.ts); an edit followed while it sounds, a held value glided by the smoothing, and a
// fade through one of its gains, as a rebuild crossfades (edit.ts)
export type { AudioPlan, Automation, BufferSpec, Edge, NodeKind, Operation, PlanNode } from './plan.ts';
export { levelAt } from './automation.ts';
export { SMOOTHING, fadeInThrough, fadeOutThrough, followEdit } from './edit.ts';

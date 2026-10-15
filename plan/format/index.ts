// ---------- plan/format: what a plan is ----------
// The data the builder and the views are handed, and read without the planner.
// Its parts:
//   - plan.ts: a plan, its version and its top node;
//   - node.ts: a node, a block or a composite;
//   - input-output.ts: a node's inputs and outputs, mono or stereo;
//   - param.ts: a param and a setting, its spec, its value as it starts;
//   - inside.ts: a composite's children, wires, macros and pools;
//   - wire.ts: from an output into an input or a param, by names;
//   - macro.ts: a composite's own param mapped onto its children's;
//   - pool.ts: children that come and go, a copy's wiring, a voice's note;
//   - address.ts: where a param or a setting is, by names from the top;
//   - version.ts: a stored plan's version.
export type { Address } from './address.ts';
export type { Channels, Input, Output } from './input-output.ts';
export type { Inside } from './inside.ts';
export type { Macro, MacroTarget } from './macro.ts';
export type { Node } from './node.ts';
export type { Param, Setting } from './param.ts';
export type { Plan } from './plan.ts';
export type { NoteAddresses, Pool } from './pool.ts';
export type { Wire, WireFrom, WireTo } from './wire.ts';
export { VERSION, versionOf } from './version.ts';

// ---------- plan/format: what a plan is ----------
// The data the builder and the views are handed, and read without the planner.
// Its parts:
//   - plan.ts: a plan, its version and its top node;
//   - node.ts: a node, a block or a composite;
//   - input-output.ts: a node's inputs and outputs, mono or stereo;
//   - param.ts: a param and a setting, its spec, its value as it starts;
//   - inside.ts: a composite's children, wires, macros and pools;
//   - wire.ts: from an output into an input or a param, by names;
//   - macro.ts: a composite's own param mapped onto its children's, its value onto theirs;
//   - pool.ts: children that come and go, a copy, its name and its wiring, a voice's note;
//   - address.ts: where a param or a setting is, by names from the top, and as text;
//   - param-at.ts: a node, a param or a setting found by its address; settings changed by it,
//     a new plan;
//   - routing.ts: what feeds what over one inside's wires, the loop check;
//   - version.ts: a stored plan's version.
export { addressOf, addressText, under, type Address, type ValuesByAddress } from './address.ts';
export type { Channels, Input, Output } from './input-output.ts';
export type { Inside } from './inside.ts';
export { macroValues, mapOnto, type Macro, type MacroTarget } from './macro.ts';
export type { Node } from './node.ts';
export type { Param, Setting } from './param.ts';
export { nodeAt, paramAt, settingAt, withSettings } from './param-at.ts';
export type { Plan } from './plan.ts';
export { copyOf, poolOfCopy, type NoteAddresses, type Pool } from './pool.ts';
export { feeds, reached } from './routing.ts';
export type { Wire, WireFrom, WireTo } from './wire.ts';
export { VERSION, versionOf } from './version.ts';

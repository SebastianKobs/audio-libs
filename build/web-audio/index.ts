// ---------- build/web-audio: the builder for Web Audio, handed a plan, handing back what's built ----------
// The only code, with the engine it takes over from (libs/web-audio-engine/), that makes Web Audio nodes.
// Its parts:
//   - builder.ts: the builder, a plan built, its blocks made, its composites opened, its placeholders said;
//   - built.ts: what it hands back, its front panel; parts.ts, the parts it's taken apart by;
//   - making.ts: what a block's maker is handed; wiring.ts, a node's jacks, a composite's wires made;
//   - placeholder.ts: a block it can't make, passed through;
//   - built-node.ts: a node built, one of Web Audio's or one made of several, in one shape;
//   - param-units.ts: a param in a plan's units, moving the Web Audio params behind it;
//   - buffers.ts: the buffers a noise or a reverb plays, each made once;
//   - blocks/: each block made in Web Audio, by its kind (makers.ts).
export { WebAudioBuilder, type WebAudioOptions, type WebAudioWhere } from './builder.ts';
export { WebAudioBuilt } from './built.ts';
export { BuiltNode, type WebAudioNode } from './built-node.ts';
export { ParamInUnits, type Automatable } from './param-units.ts';
export { Buffers, impulse, noise } from './buffers.ts';
export { biquadOf } from './blocks/filter.ts';
export { limiterNodes, makeupOf } from './blocks/limiter.ts';
export { panOf, type PanLaw } from './blocks/pan.ts';

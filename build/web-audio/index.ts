// ---------- build/web-audio: the builder for Web Audio, handed a plan, handing back what's built ----------
// The only code that makes Web Audio nodes.
// Its parts:
//   - context.ts: the audio context a plan is built in, made at a low latency, on a clock;
//   - builder.ts: the builder, a plan built, its blocks made, its composites opened, its placeholders said;
//   - built.ts: what it hands back, its front panel; parts.ts, the parts it's taken apart by;
//   - making.ts: what a block's maker is handed; wiring.ts, a node's jacks, a composite's wires made;
//   - placeholder.ts: a block it can't make, passed through;
//   - rebuild.ts: what's built built again, the old ringing out, faded where it makes sound of its own;
//   - built-node.ts: a node built, one of Web Audio's or one made of several, in one shape;
//   - param-units.ts: a param in a plan's units, moving the Web Audio params behind it;
//   - buffers.ts: the buffers a noise or a reverb plays, each made once;
//   - meters.ts: a meter on a node, its peak; output.ts, the output after what's built, faded in and out;
//   - power.ts: the audio's power: started, what's built into the output, the clock on its time;
//     the output faded out and the context suspended, and back on;
//   - engine-building.ts: the Web Audio builder in the engine's context, its buffers shared;
//   - blocks/: each block made in Web Audio, by its kind (makers.ts).
export { ClockedContext, type ClockedContextOptions } from './context.ts';
export { WebAudioBuilder, type WebAudioOptions, type WebAudioWhere } from './builder.ts';
export { WebAudioBuilt, type Building } from './built.ts';
export { CROSSFADE, RING_OUT } from './rebuild.ts';
export { BuiltNode, type WebAudioNode } from './built-node.ts';
export { ParamInUnits, type Automatable } from './param-units.ts';
export { automate } from './automation.ts';
export { Buffers, impulse, noise } from './buffers.ts';
export { biquadOf } from './blocks/filter.ts';
export { limiterNodes, makeupOf } from './blocks/limiter.ts';
export { panOf, type PanLaw } from './blocks/pan.ts';
export { meterOn, type PeakMeter } from './meters.ts';
export { FADE_IN, FADE_OUT, Output } from './output.ts';
export { AudioPower, type BrowserAudio, type EngineOnceStarted } from './power.ts';
export { EngineBuilding, buildingIn, type BuildingIn } from './engine-building.ts';
export { Copies, type Editable } from './copies.ts';

// ---------- libs/web-audio-engine: the edge to Web Audio. A context, and plans built in it ----------
// new Engine() makes the audio context, for low latency; iOS's audio session, whether the silent switch is heeded, is the app's (W3a).
// It knows no clock: toContext turns the caller's time into the context's, and at(t) does it never into the audio's past, so a sound due
// now starts with the next chunk the audio renders. build(plan, t, destination) makes a plan's nodes (libs/audio-plan/) at t, the context's
// time, into destination, and returns them; apply(nodes, operations, t) runs a handle's operations on them. buffer(spec) makes a buffer
// a plan names once, when it's first asked for (buffers.ts): { noise: 2 }, 2 s of white noise; { impulse: 3.5 }, a reverb's impulse
// response. meter(node) a meter on a node, reading its peak (meters.ts); canPan() whether the context has a stereo
// panner. It makes every Web Audio node of the sound, from a plan (F6c), but a meter's, which only listens. Everything it needs is
// passed in, so it reads no globals: the AudioContext class, and random() for its buffers' noise.
// Its parts:
//   - nodes.ts: the kinds of node a plan names, made in the context;
//   - build.ts: a plan's nodes made, started, wired and automated;
//   - meters.ts: a meter.
// A node as built, a param in the plan's units, the limiter, a pan, a biquad and the buffers are the
// builder's (libs/build/web-audio/), which takes over from it.

import { buildNode, connectEdge, nodeOf, paramOf, type Building } from './build.ts';
import { automate, Buffers, type BuiltNode } from '../build/web-audio/index.ts';
import { meterOn, type PeakMeter } from './meters.ts';
import { nodeMakers } from './nodes.ts';
import type { AudioPlan, BufferSpec, Operation } from '../audio-plan/index.ts';
export { paramOf } from './build.ts';
export { makeupOf, type Automatable, type BuiltNode } from '../build/web-audio/index.ts';
export type { PeakMeter };

export interface EngineOptions {
  AudioContext: new (options: { latencyHint?: AudioContextLatencyCategory | number }) => AudioContext;
  toContext?: (t: number) => number;
  latencyHint?: AudioContextLatencyCategory | number;
  random?: () => number;
}

export class Engine {
  readonly audioContext: AudioContext;
  readonly #toContext: (t: number) => number;
  readonly #buffers: Buffers; // each made once, when a plan first names it
  readonly #building: Building; // what a plan's node is made by: its kinds, made in the context (nodes.ts), and its buffers

  constructor({
    AudioContext,
    toContext = (t) => t,
    latencyHint = 'interactive',
    random = Math.random,
  }: EngineOptions) {
    const audioContext = new AudioContext({ latencyHint });
    this.audioContext = audioContext;
    this.#toContext = toContext;
    this.#buffers = new Buffers(audioContext, random);
    this.#building = {
      makers: nodeMakers(audioContext, () => this.canPan()),
      buffer: (spec) => this.buffer(spec),
    };
  }
  now(): number {
    return this.audioContext.currentTime;
  }
  // the caller's time in the context's, never in its past
  at(t: number): number {
    return Math.max(this.#toContext(t), this.now());
  }
  // a buffer a plan names: so many seconds of noise, or a reverb's impulse response
  buffer(spec: BufferSpec): AudioBuffer {
    if ('noise' in spec) {
      return this.#buffers.noise(spec.noise);
    }
    return this.#buffers.impulse(spec.impulse);
  }
  // a plan's nodes, each made and started at the plan's times from t, then wired to each other and the destination; with none, its way
  // out is its caller's to wire (an FX channel's input, before its chain)
  build(plan: AudioPlan, t: number, destination?: AudioNode): BuiltNode[] {
    const nodes = plan.nodes.map((planned) => buildNode(planned, t, this.#building));
    for (const [from, to] of plan.edges) {
      connectEdge(nodeOf(nodes, from), to, nodes, destination);
    }
    return nodes;
  }
  apply(nodes: BuiltNode[], operations: Operation[], t: number): void {
    for (const operation of operations) {
      const node = nodeOf(nodes, operation.id);
      if (operation.stop !== undefined) {
        node.stop(t + operation.stop); // an operation stops only a source
      } else {
        automate(paramOf(node, operation.param!), operation.events!, t);
      }
    }
  }
  // a meter on a node, reading its peak (meters.ts)
  meter(node: AudioNode): PeakMeter {
    return meterOn(this.audioContext, node);
  }
  // whether the context has a stereo panner, asked each time: some older browsers have none; where it hasn't, a plan's panner passes the
  // sound through, unpanned
  canPan(): boolean {
    return typeof this.audioContext.createStereoPanner === 'function';
  }
}

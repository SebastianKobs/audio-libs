// ---------- libs/web-audio-engine/composite: a node the engine builds from several of Web Audio's ----------
// A plan's node is one of Web Audio's, its own way in and out, or one the engine builds from several (a limiter, limiter.ts): where its
// sound comes in (input), where it goes out (output), and its params by the plan's names, in the plan's units (param-in-units.ts). A
// sound can't be cabled into one of those: they aren't Web Audio's. What a meter reads inside it, by name (points: a limiter's in, after
// its gain, and out), and what it says of itself (readings: how much a limiter takes away)
import type { Automatable } from './param-in-units.ts';

// a node built from several: its way in and out, its params, where it can be read and what it says, and every node it's made of, to
// let go of
export class CompositeNode {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly params: Readonly<Record<string, Automatable>>;
  readonly points: Readonly<Record<string, AudioNode>>;
  readonly readings: Readonly<Record<string, () => number>>;
  readonly parts: readonly AudioNode[];

  constructor({
    input,
    output,
    params,
    points = {},
    readings = {},
    parts,
  }: {
    input: AudioNode;
    output: AudioNode;
    params: Record<string, Automatable>;
    points?: Record<string, AudioNode>;
    readings?: Record<string, () => number>;
    parts: AudioNode[];
  }) {
    this.input = input;
    this.output = output;
    this.params = params;
    this.points = points;
    this.readings = readings;
    this.parts = parts;
  }
}

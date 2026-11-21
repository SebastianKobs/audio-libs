// ---------- build/web-audio/blocks/one-pole: a first-order lowpass in Web Audio ----------
// An IIRFilterNode (dsp/filters/'s onePoleLowpass()). Its coefficients are fixed once made, so a new cutoff makes a new
// one in its place between the same neighbors, the old one let go: a cutoff lands as it's told, as a curve does.
import { onePoleLowpass, type IirCoefficients } from '../../../../dsp/filters/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';

const OPEN: IirCoefficients = { feedforward: [1], feedback: [1] }; // passing the sound as it comes

// a one pole between two nodes, its cutoff none where it's open
export class OnePoleBetween {
  readonly #making: Making;
  readonly #before: AudioNode;
  readonly #after: AudioNode;
  #filter: IIRFilterNode;
  #hz: number | undefined;

  constructor(making: Making, before: AudioNode, after: AudioNode, hz: number | undefined) {
    this.#making = making;
    this.#before = before;
    this.#after = after;
    this.#hz = hz;
    this.#filter = this.#between(hz);
  }
  // at a new cutoff: a new filter wired in, the old one out
  tune(hz: number | undefined): void {
    if (hz === this.#hz) {
      return;
    }
    const old = this.#filter;
    this.#hz = hz;
    this.#filter = this.#between(hz);
    this.#before.disconnect(old);
    old.disconnect(this.#after);
  }
  #between(hz: number | undefined): IIRFilterNode {
    const { feedforward, feedback } = hz === undefined ? OPEN : onePoleLowpass(hz, this.#making.context.sampleRate);
    const filter = this.#making.kept(this.#making.context.createIIRFilter([...feedforward], [...feedback]));
    this.#before.connect(filter);
    filter.connect(this.#after);
    return filter;
  }
}

// the block: its filter between a way in and a way out that stay as it's made again
export function onePole(node: Node, making: Making): BuiltNode {
  const input = making.kept(making.context.createGain());
  const output = making.kept(making.context.createGain());
  let hz = numberOf(node, 'frequency');
  const pole = new OnePoleBetween(making, input, output, hz);
  const frequency = toldParam(
    () => hz,
    (value) => {
      hz = value;
      pole.tune(value);
    },
  );
  return new BuiltNode({ input, output, params: { frequency }, kind: 'a one-pole lowpass, an IIRFilterNode' });
}

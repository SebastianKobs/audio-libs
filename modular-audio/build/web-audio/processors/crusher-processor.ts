// ---------- build/web-audio/processors/crusher-processor: the crusher, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of libs/dsp/crusher/.
// The kernel crushes each channel with a state of its own; this makes it a node: its bits and rate k-rate, one value a block.
// Always kept running: a desk's insert lives as long as the page, and Chrome never calls again a processor that once said it's done,
// though its input comes back.
import { Crusher } from '../../../../dsp/crusher/index.ts';
import { CRUSHER_SPECS } from '../../../plan/blocks/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'crusher' satisfies ProcessorName;
const { bits, rate } = CRUSHER_SPECS;

class CrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'bits',
        defaultValue: bits.default,
        minValue: bits.range[0],
        maxValue: bits.range[1],
        automationRate: 'k-rate',
      },
      {
        name: 'rate',
        defaultValue: rate.default,
        minValue: rate.range[0],
        maxValue: rate.range[1],
        automationRate: 'k-rate',
      },
    ];
  }

  readonly #crusher = new Crusher({ sampleRate });

  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    this.#crusher.render(inputs[0] ?? [], outputs[0] ?? [], {
      bits: parameters['bits']?.[0] ?? bits.default,
      rate: parameters['rate']?.[0] ?? rate.default,
    });
    return true;
  }
}

registerProcessor(NAME, CrusherProcessor);

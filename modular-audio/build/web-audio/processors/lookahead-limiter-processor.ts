// ---------- build/web-audio/processors/lookahead-limiter-processor: the lookahead limiter, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of libs/dsp/true-peak/.
// The kernel does the work, a sample in and a sample out; this makes it a node: its four params k-rate, one value a block, and what
// it took off said every 2048 frames, as { reduction } in dB. Always kept running: a desk's insert.
import { LookaheadLimiter, type LookaheadParams } from '../../../../dsp/true-peak/index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'lookahead limiter' satisfies ProcessorName;
const SPECS = BLOCKS[NAME].params;
const REPORT_EVERY = 2048; // frames between { reduction } messages: 43 ms at 48 kHz

// its params as the block declares them, each k-rate
const DESCRIPTORS: AudioParamDescriptor[] = SPECS.map(
  ({ name, default: defaultValue, range: [minValue, maxValue] }) => ({
    name,
    defaultValue,
    minValue,
    maxValue,
    automationRate: 'k-rate',
  }),
);

class LookaheadLimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return DESCRIPTORS;
  }

  readonly #limiter: LookaheadLimiter;
  #sinceReport = 0; // frames since the last { reduction }

  // its lookahead, in seconds, from its options; the kernel's own 5 ms where none is given
  constructor(options?: AudioWorkletNodeOptions) {
    super();
    const { lookahead } = (options?.processorOptions ?? {}) as { lookahead?: unknown };
    this.#limiter = new LookaheadLimiter({
      sampleRate,
      ...(typeof lookahead === 'number' && { lookahead }),
    });
  }
  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0];
    const frames = output?.[0]?.length;
    if (!output || !frames) {
      return true;
    }
    this.#limiter.render(inputs[0] ?? [], output, frames, paramsOf(parameters));
    this.#report(frames);
    return true;
  }

  // what it took off since the last report, once REPORT_EVERY frames have gone
  #report(frames: number): void {
    this.#sinceReport += frames;
    if (this.#sinceReport < REPORT_EVERY) {
      return;
    }
    this.#sinceReport -= REPORT_EVERY;
    this.port.postMessage({ reduction: this.#limiter.reduced() });
  }
}

// each param's value for this block, k-rate: the first of its one
function paramsOf(parameters: Record<string, Float32Array>): LookaheadParams {
  const [gain, ceiling, release, clip] = SPECS.map(({ name, default: fallback }) => parameters[name]?.[0] ?? fallback);
  return { gain: gain!, ceiling: ceiling!, release: release!, clip: clip! }; // four specs, four values
}

registerProcessor(NAME, LookaheadLimiterProcessor);

// ---------- build/web-audio/processors/saturating-filter-processor: a filter that saturates and sings, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of libs/dsp/filters/.
// The kernel filters a channel; this makes it a node, a filter a channel, each on a seed of its own: seed + its channel's number
// where its options hand one (one seed, one render), Math.random where they don't.
// Its frequency, detune, resonance and drive a-rate, so an envelope can be cabled into each; its compensation and mode k-rate.
// Let go once told { stop }: true until then, as a desk's insert is never let go.
import { SaturatingFilterChannels } from '../../../../dsp/filters/index.ts';
import { seeded } from '../../../../base/util/index.ts';
import { SATURATING_FILTER_SPECS } from '../../../plan/blocks/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'saturating filter' satisfies ProcessorName;
const { frequency, detune, resonance, drive, compensation, mode } = SATURATING_FILTER_SPECS;

class SaturatingFilterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'frequency',
        defaultValue: frequency.default,
        minValue: frequency.range[0],
        maxValue: frequency.range[1],
        automationRate: 'a-rate',
      },
      {
        name: 'detune',
        defaultValue: detune.default,
        minValue: detune.range[0],
        maxValue: detune.range[1],
        automationRate: 'a-rate',
      },
      {
        name: 'resonance',
        defaultValue: resonance.default,
        minValue: resonance.range[0],
        maxValue: resonance.range[1],
        automationRate: 'a-rate',
      },
      {
        name: 'drive',
        defaultValue: drive.default,
        minValue: drive.range[0],
        maxValue: drive.range[1],
        automationRate: 'a-rate',
      },
      {
        name: 'compensation',
        defaultValue: compensation.default,
        minValue: compensation.range[0],
        maxValue: compensation.range[1],
        automationRate: 'k-rate',
      },
      { name: 'mode', defaultValue: 0, minValue: 0, maxValue: mode.choices.length - 1, automationRate: 'k-rate' },
    ];
  }

  readonly #filters: SaturatingFilterChannels;

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    const { seed } = (options?.processorOptions ?? {}) as { seed?: unknown };
    this.#filters = new SaturatingFilterChannels({
      sampleRate,
      ...(typeof seed === 'number' && { randomOf: (channel: number) => seeded(seed + channel) }),
    });
    this.port.onmessage = ({ data }: MessageEvent<unknown>) => this.#filters.told(data);
  }
  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    return this.#filters.process(inputs[0] ?? [], outputs[0] ?? [], parameters, currentTime);
  }
}

registerProcessor(NAME, SaturatingFilterProcessor);

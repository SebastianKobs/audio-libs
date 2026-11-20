// ---------- build/web-audio/processors/operators-processor: phase modulation, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of libs/dsp/oscillators/.
// A source: started and stopped by { start } and { stop } messages, in the context's seconds, as Web Audio's own sources are.
// Its params are the block's nineteen: the note's frequency and detune and each level a-rate, the rest k-rate.
// Its algorithm and start phases come in its options, read once, as the block hands them.
import { OperatorVoice, ScheduledVoice, type OperatorSetup } from '../../../../dsp/oscillators/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'operators' satisfies ProcessorName;
const OPERATORS = [1, 2, 3, 4];

// each operator's four params, in the block's order: level a-rate, so an envelope can be cabled into it
const OPERATOR_PARAMS: AudioParamDescriptor[] = OPERATORS.flatMap((operator) => [
  { name: `ratio${operator}`, defaultValue: 1, minValue: 0, maxValue: 32, automationRate: 'k-rate' },
  { name: `detune${operator}`, defaultValue: 0, minValue: -1200, maxValue: 1200, automationRate: 'k-rate' },
  {
    name: `level${operator}`,
    defaultValue: operator === 1 ? 1 : 0,
    minValue: 0,
    maxValue: 40,
    automationRate: 'a-rate',
  },
  { name: `wave${operator}`, defaultValue: 0, minValue: 0, maxValue: 7, automationRate: 'k-rate' },
]);

class OperatorsProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'frequency', defaultValue: 440, minValue: 0, maxValue: 24000, automationRate: 'a-rate' },
      { name: 'detune', defaultValue: 0, minValue: -4800, maxValue: 4800, automationRate: 'a-rate' },
      { name: 'feedback', defaultValue: 0, minValue: 0, maxValue: 4, automationRate: 'k-rate' },
      ...OPERATOR_PARAMS,
    ];
  }

  readonly #source: ScheduledVoice;

  // its algorithm and phases from its options: the block hands them as the voice is made
  constructor(options?: AudioWorkletNodeOptions) {
    super();
    this.#source = new ScheduledVoice(new OperatorVoice((options?.processorOptions ?? {}) as OperatorSetup));
    this.port.onmessage = ({ data }: MessageEvent<unknown>) => this.#source.told(data);
  }
  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    return this.#source.process(outputs, parameters, { sampleRate, currentTime });
  }
}

registerProcessor(NAME, OperatorsProcessor);

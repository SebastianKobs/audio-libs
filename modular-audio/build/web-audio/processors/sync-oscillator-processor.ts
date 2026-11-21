// ---------- build/web-audio/processors/sync-oscillator-processor: hard sync, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of dsp/oscillators/.
// A source: started and stopped by { start } and { stop } messages, in the context's seconds, as Web Audio's own sources are.
// Its params are the block's: frequency, detune and sync a-rate, wave k-rate.
import { ScheduledVoice, SyncVoice } from '../../../../dsp/oscillators/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'sync oscillator' satisfies ProcessorName;

class SyncOscillatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      { name: 'frequency', defaultValue: 440, minValue: 0, maxValue: 24000, automationRate: 'a-rate' },
      { name: 'detune', defaultValue: 0, minValue: -4800, maxValue: 4800, automationRate: 'a-rate' },
      { name: 'sync', defaultValue: 0, minValue: 0, maxValue: 48, automationRate: 'a-rate' },
      { name: 'wave', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  readonly #source = new ScheduledVoice(new SyncVoice());

  constructor() {
    super();
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

registerProcessor(NAME, SyncOscillatorProcessor);

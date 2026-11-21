// ---------- build/web-audio/processors/germanium-stage-processor: a germanium transistor stage, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of dsp/circuits/.
// The kernel runs each channel through a circuit of its own at 2 × the rate; this makes it a node: its drive, level
// and voicing k-rate, one value a block, the voicing by its index.
// Always kept running: a desk's insert lives as long as the page, and Chrome never calls again a processor that once said
// it's done, though its input comes back.
import { GermaniumDrive } from '../../../../dsp/circuits/index.ts';
import { GERMANIUM_STAGE_SPECS } from '../../../plan/blocks/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'germanium stage' satisfies ProcessorName;
const { drive, level, voicing } = GERMANIUM_STAGE_SPECS;
const VOICING_DEFAULT = voicing.choices.indexOf(voicing.default);

class GermaniumStageProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'drive',
        defaultValue: drive.default,
        minValue: drive.range[0],
        maxValue: drive.range[1],
        automationRate: 'k-rate',
      },
      {
        name: 'level',
        defaultValue: level.default,
        minValue: level.range[0],
        maxValue: level.range[1],
        automationRate: 'k-rate',
      },
      {
        name: 'voicing',
        defaultValue: VOICING_DEFAULT,
        minValue: 0,
        maxValue: voicing.choices.length - 1,
        automationRate: 'k-rate',
      },
    ];
  }

  readonly #drive = new GermaniumDrive({ sampleRate });

  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    this.#drive.render(inputs[0] ?? [], outputs[0] ?? [], {
      drive: parameters['drive']?.[0] ?? drive.default,
      level: parameters['level']?.[0] ?? level.default,
      voicing: parameters['voicing']?.[0] ?? VOICING_DEFAULT,
    });
    return true;
  }
}

registerProcessor(NAME, GermaniumStageProcessor);

// ---------- build/web-audio/processors/grains-processor: granular freeze and smear, in the audio thread ----------
// An AudioWorklet module, loaded by its URL (worklets.ts); Vite bundles it with what it imports, the kernel of libs/dsp/grains/.
// The kernel keeps the input and plays grains from it; this makes it a node: its six params k-rate, one value a block.
// Its memory and its seed come from its options: the same seed, the same cloud; none, and it draws on Math.random.
// Always kept running: a desk's insert, as the crusher's.
import { GrainCloud, type GrainParams } from '../../../../dsp/grains/index.ts';
import { seeded } from '../../../../base/util/index.ts';
import { GRAINS_SPECS } from '../../../plan/blocks/index.ts';
import type { ProcessorName } from '../worklets.ts';

const NAME = 'grains' satisfies ProcessorName;
const { freeze, position, size, density, pitch, spray } = GRAINS_SPECS;
const SPECS = [freeze, position, size, density, pitch, spray];

// each param as the block declares it, k-rate
const DESCRIPTORS: AudioParamDescriptor[] = SPECS.map(
  ({ name, default: defaultValue, range: [minValue, maxValue] }) => ({
    name,
    defaultValue,
    minValue,
    maxValue,
    automationRate: 'k-rate',
  }),
);

class GrainsProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): AudioParamDescriptor[] {
    return DESCRIPTORS;
  }

  readonly #cloud: GrainCloud;

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    const { memory, seed } = (options?.processorOptions ?? {}) as { memory?: unknown; seed?: unknown };
    this.#cloud = new GrainCloud({
      sampleRate,
      ...(typeof memory === 'number' && { memory }),
      ...(typeof seed === 'number' && { random: seeded(seed) }),
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
    this.#cloud.render(inputs[0] ?? [], output, frames, paramsOf(parameters));
    return true;
  }
}

// each param's value for this block, k-rate: the first of its one, the block's default where it has none
function paramsOf(parameters: Record<string, Float32Array>): GrainParams {
  const at = ({ name, default: fallback }: { name: string; default: number }): number =>
    parameters[name]?.[0] ?? fallback;
  return {
    freeze: at(freeze),
    position: at(position),
    size: at(size),
    density: at(density),
    pitch: at(pitch),
    spray: at(spray),
  };
}

registerProcessor(NAME, GrainsProcessor);

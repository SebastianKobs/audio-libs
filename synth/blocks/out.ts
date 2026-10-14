// ---------- libs/synth/blocks/out: the patch's one output ----------
// Where the chain and what's sent straight out meet (I1e): a gain, its volume, at 0 dB unless it says, built for every instrument, so what
// sets it while a note sounds has one (I1f), and a rebuilt voice fades in through it as the old fades out (G0.2b); an FX module's level is
// its strip's. Its ports: 'out', where what goes out comes in, and
// 'out.volume'
import type { Block } from '../plan-builder.ts';
import type { Out } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';

// its value (params.ts): its volume, a share, 1 at 0 dB
const OUT_SPECS = {
  volume: { name: 'volume', range: [0, 2, 0.01], default: 1 },
} as const satisfies ParamSpecs;

export default {
  key: 'out',
  everyInstrument: true,
  paramSpecs: OUT_SPECS,
  plan(out, builder) {
    const gain = builder.node('gain', 'out');
    builder.value(gain, 'gain', volumeOf(out));
    builder.offer('out', gain);
    builder.offer('out.volume', gain, 'gain');
  },
} satisfies Block<Out>;

// its volume, a share: 1, at 0 dB, unless it says
export function volumeOf(out: Out | undefined): number {
  return out?.volume ?? OUT_SPECS.volume.default;
}

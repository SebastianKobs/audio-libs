// ---------- libs/synth/blocks/vca: the chain's VCA ----------
// A gain an envelope cabled to 'vca.gain' moves (blocks/envelope.ts), then its level, a gain of its own, set while a note sounds
// (I1e, I1f): the envelope a share of it, its silence written below the level so what comes out starts at the floor, every exponential
// ramp keeping its shape. With no envelope, open, at its level. Its ports: 'vca', where it takes its sound in, 'vca.gain', its
// envelope's, and 'vca.level'. A note's end is its envelopes' release (plan-builder.ts, release())
import type { Block } from '../plan-builder.ts';
import type { Vca } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';
import { SILENCE } from '../shapes.ts';

// its value (params.ts): its level, a share, 1 at 0 dB
const VCA_SPECS = {
  level: { name: 'level', range: [0, 2, 0.01], default: 1 },
} as const satisfies ParamSpecs;

export default {
  key: 'vca',
  paramSpecs: VCA_SPECS,
  plan(vca, builder) {
    const level = vca.level ?? VCA_SPECS.level.default;
    const moved = builder.node('gain', 'vca');
    const gain = builder.node('gain', 'vca');
    builder.value(gain, 'gain', level);
    builder.link(moved, gain);
    builder.offer('vca', moved);
    builder.exit('vca', gain);
    builder.offer('vca.gain', moved, 'gain', { base: 1, silence: SILENCE / level });
    builder.offer('vca.level', gain, 'gain');
  },
} satisfies Block<Vca>;

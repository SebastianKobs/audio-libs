// ---------- libs/synth/blocks/gain: a stage that sets how loud ----------
// A gain, a stage any chain can list, built whenever one does, at 1 too, so what sets it later has one: a Utility is a gain and a pan.
// An instrument's volume is out's (blocks/out.ts). Its ports: 'gain', 'gain.gain'
import type { Block } from '../plan-builder.ts';

export default {
  key: 'gain',
  paramSpecs: { name: 'gain', range: [0, 2, 0.01] }, // a share
  plan(gain, builder) {
    const node = builder.node('gain', 'gain');
    builder.value(node, 'gain', gain);
    builder.offer('gain', node);
    builder.offer('gain.gain', node, 'gain');
  },
} satisfies Block<number>;

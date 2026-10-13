// ---------- libs/synth/blocks/tremolo: the chain's tremolo ----------
// A level an LFO moves (the harmonium's bellows). At rest it passes the sound unchanged. Its ports: 'tremolo', 'tremolo.gain'
import type { Block } from '../plan-builder.ts';

export default {
  key: 'tremolo',
  paramSpecs: {}, // none: on, or not there
  plan(_spec, builder) {
    const gain = builder.node('gain', 'tremolo');
    builder.offer('tremolo', gain);
    builder.offer('tremolo.gain', gain, 'gain');
  },
} satisfies Block<object>;

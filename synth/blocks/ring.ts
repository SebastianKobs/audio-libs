// ---------- libs/synth/blocks/ring: ring modulation ----------
// The oscs sent into it (into: 'ring 1') have their level start at 0, and a modulator at a ratio to the note moves it, at audio rate, so
// the two multiply. Its sound goes on into the chain, or where it says. Konstrukt's chime rings at ratio 1.5, a fifth above, which puts
// its sidebands at half and five halves of the note. Its port: 'ring 1'
import type { Block } from '../plan-builder.ts';
import type { Ring } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';
import { RATIO_SPEC, STOP_SPEC } from '../params.ts';

// its values (params.ts): its modulator's ratio to the note, and its stop
const RING_SPECS = {
  ratio: RATIO_SPEC,
  stop: STOP_SPEC,
} as const satisfies ParamSpecs;

export default {
  key: 'ring',
  many: true,
  paramSpecs: RING_SPECS,
  plan(ring, builder, index) {
    const gain = builder.node('gain', `ring ${index}`);
    const modulator = builder.node('oscillator', `ring ${index}`);
    builder.value(gain, 'gain', 0);
    builder.value(modulator, 'frequency', builder.frequency * ring.ratio);
    builder.link(modulator, gain, 'gain');
    builder.start(modulator);
    builder.stop(modulator, ring.stop);
    builder.sources.push(modulator);
    builder.offer(`ring ${index}`, gain);
    builder.into(gain, ring.into);
  },
} satisfies Block<Ring>;

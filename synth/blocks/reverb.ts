// ---------- libs/synth/blocks/reverb: a reverb, for an FX module ----------
// A convolver with an impulse response the engine makes: so many seconds of noise, darker as it decays (seconds, 3.5). Its port: 'reverb'
import type { Block } from '../plan-builder.ts';
import type { Reverb } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';
import { REVERB_LENGTH } from '../../plan/blocks/index.ts';

// its value (params.ts): how long its tail is
const REVERB_SPECS = {
  seconds: REVERB_LENGTH,
} as const satisfies ParamSpecs;

export default {
  key: 'reverb',
  paramSpecs: REVERB_SPECS,
  plan(reverb, builder) {
    const convolver = builder.node('convolver', 'reverb', {
      buffer: { impulse: reverb.seconds ?? REVERB_SPECS.seconds.default },
    });
    builder.offer('reverb', convolver);
  },
} satisfies Block<Reverb>;

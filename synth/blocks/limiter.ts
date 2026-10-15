// ---------- libs/synth/blocks/limiter: a stage that holds the sound under its ceiling ----------
// A limiter as Ableton's: its gain into it, in dB; its ceiling, where it acts and the most that comes out, in dBFS; its release, in s. One
// node, as data: how it holds there, as hard as Web Audio's compressor goes, is the engine's (libs/web-audio-engine/limiter.ts). Its ports:
// 'limiter', 'limiter.gain', 'limiter.ceiling', 'limiter.release'
import type { Block } from '../plan-builder.ts';
import { val } from '../values.ts';
import type { Limiter } from '../patch.ts';
import { LIMITER_SPECS } from '../../plan/blocks/index.ts';

export default {
  key: 'limiter',
  paramSpecs: LIMITER_SPECS,
  plan(limiter, builder) {
    const node = builder.node('limiter', 'limiter');
    for (const param of ['gain', 'ceiling', 'release'] as const) {
      builder.value(node, param, val(limiter[param], builder.values)); // a number, or a param's, as the Limiter module's
      builder.offer(`limiter.${param}`, node, param);
    }
    builder.offer('limiter', node);
  },
} satisfies Block<Limiter>;

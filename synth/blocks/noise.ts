// ---------- libs/synth/blocks/noise: noise ----------
// A buffer of it ('noise', 2 s of it, or a short 'breath', 0.2 s, the plan naming it by its length, the engine making any, W2b), through a filter of its own, with a level, or an
// envelope cabled to it (blocks/envelope.ts), into the chain or where it says. Looped, it runs on (wind, a brush's bed). It starts at an
// offset into its buffer, a share of the note's rand(), so each brush hit is noise from somewhere else in it. Its ports: 'noise 1.gain'
// (its level), 'noise 1.frequency' (its filter)
import type { Block } from '../plan-builder.ts';
import { biquadsOf } from './filter.ts';
import { NOISE_SECONDS } from '../../plan/blocks/index.ts';
import type { Noise } from '../patch.ts';
import { FILTER_SPECS, LEVEL_SPEC, STOP_SPEC } from '../params.ts';
import type { ParamSpecs } from '../../params/index.ts';

// its values (params.ts): its buffer, how far into it it starts at most, its own filter, its level, and its stop
const NOISE_SPECS = {
  buffer: { name: 'buffer', choices: ['noise', 'breath'], default: 'noise' },
  offset: { name: 'offset', unit: 's', range: [0, 2, 0.01] },
  filter: FILTER_SPECS,
  level: LEVEL_SPEC,
  stop: STOP_SPEC,
} as const satisfies ParamSpecs;
export default {
  key: 'noise',
  many: true,
  paramSpecs: NOISE_SPECS,
  plan(noise, builder, index) {
    const source = builder.node('buffer', `noise ${index}`, {
      buffer: { noise: NOISE_SECONDS[noise.buffer ?? NOISE_SPECS.buffer.default] },
      loop: !!noise.loop,
    });
    const { first, last } = biquadsOf(noise.filter, builder, `noise ${index}`);
    const gain = builder.levelGain(`noise ${index}`, noise.level);
    builder.link(source, first);
    builder.link(last, gain);
    builder.into(gain, noise.into);
    builder.start(source, noise.offset === undefined ? undefined : builder.values.random() * noise.offset);
    builder.stop(source, noise.stop);
    builder.sources.push(source);
  },
} satisfies Block<Noise>;

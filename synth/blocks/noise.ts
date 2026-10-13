// ---------- libs/synth/blocks/noise: noise ----------
// A buffer of it ('noise', 2 s of it, or a short 'breath', 0.2 s, the plan naming it by its length, the engine making any, W2b), through a filter of its own, with a level, or an
// envelope cabled to it (blocks/envelope.ts), into the chain or where it says. Looped, it runs on (wind, a brush's bed). It starts at an
// offset into its buffer, a share of the note's rand(), so each brush hit is noise from somewhere else in it. Its ports: 'noise 1.gain'
// (its level), 'noise 1.frequency' (its filter)
import { freq, val } from '../values.ts';
import type { PlanNode } from '../../audio-plan/index.ts';
import type { Block, PlanBuilder } from '../plan-builder.ts';
import type { Noise } from '../patch.ts';
import { FILTER_SPECS, type ParamSpecs } from '../params.ts';

// its values (params.ts): its buffer, how far into it it starts at most, its own filter, its level, and its stop
const NOISE_SPECS = {
  buffer: { name: 'buffer', choices: ['noise', 'breath'], default: 'noise' },
  offset: { name: 'offset', unit: 's', range: [0, 2, 0.01] },
  filter: FILTER_SPECS,
  level: { name: 'level', range: [0, 2, 0.01] },
  stop: { name: 'stop', unit: 's', range: [0, 10, 0.01] },
} as const satisfies ParamSpecs;
// s: how long each buffer is, the plan naming it by its length
const NOISE_SECONDS = { noise: 2, breath: 0.2 } as const satisfies Record<
  (typeof NOISE_SPECS.buffer.choices)[number],
  number
>;

export default {
  key: 'noise',
  many: true,
  paramSpecs: NOISE_SPECS,
  plan(noise, builder, index) {
    const source = builder.node('buffer', `noise ${index}`, {
      buffer: { noise: NOISE_SECONDS[noise.buffer ?? NOISE_SPECS.buffer.default] },
      loop: !!noise.loop,
    });
    const fl = builder.node('biquad', `noise ${index}`, { type: noise.filter.type });
    const gain = builder.node('gain', `noise ${index}`);
    const cutoff = freq(noise.filter.freq, builder.frequency, builder.values);
    builder.value(fl, 'frequency', cutoff);
    if (noise.filter.q !== undefined) {
      builder.value(fl, 'Q', noise.filter.q);
    }
    levelOf(noise, builder, index, gain);
    builder.link(source, fl);
    builder.link(fl, gain);
    builder.into(gain, noise.into);
    builder.start(source, noise.offset === undefined ? undefined : builder.values.random() * noise.offset);
    builder.stop(source, noise.stop);
    builder.offer(`noise ${index}.frequency`, fl, 'frequency', { base: cutoff });
    builder.sources.push(source);
  },
} satisfies Block<Noise>;

// its level's gain: at its level, or an envelope's full scale where one moves it; its port
function levelOf(noise: Noise, builder: PlanBuilder, index: number, gain: PlanNode): void {
  const level = noise.level === undefined ? undefined : val(noise.level, builder.values);
  if (level !== undefined && !builder.moves(`noise ${index}.gain`)) {
    builder.value(gain, 'gain', level);
  }
  builder.offer(`noise ${index}.gain`, gain, 'gain', { base: level ?? 1 });
}

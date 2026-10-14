// ---------- libs/synth/blocks/fm: frequency modulation ----------
// A modulator at a ratio to the note moves its carrier's frequency (carrier: which osc), at audio rate, by its index, times the note's
// frequency; an envelope cabled to its port 'fm 1.gain' (blocks/envelope.ts) moves it from there by its amount, in the index's units (I1h).
// The Rhodes is FM at ratio 1
import type { Block } from '../plan-builder.ts';
import type { FrequencyModulation } from '../patch.ts';
import type { ParamSpecs } from '../../params/index.ts';
import { RATIO_SPEC, STOP_SPEC } from '../params.ts';

// its values (params.ts): its ratio to the note, its index, its carrier osc and its stop
const FM_SPECS = {
  ratio: RATIO_SPEC,
  index: { name: 'index', range: [0, 20, 0.01], default: 0 },
  carrier: { name: 'carrier', range: [1, 8, 1] },
  stop: STOP_SPEC,
} as const satisfies ParamSpecs;

export default {
  key: 'fm',
  many: true,
  paramSpecs: FM_SPECS,
  plan(fm, builder, index) {
    const modulator = builder.node('oscillator', `fm ${index}`);
    const depth = builder.node('gain', `fm ${index}`);
    const depthIndex = fm.index ?? FM_SPECS.index.default;
    builder.value(modulator, 'frequency', builder.frequency * fm.ratio);
    builder.movable(depth, 'gain', {
      port: `fm ${index}.gain`,
      value: depthIndex * builder.frequency,
      scale: { base: builder.frequency, rest: depthIndex },
    });
    builder.link(modulator, depth);
    builder.into(depth, `osc ${fm.carrier}.frequency`);
    builder.start(modulator);
    builder.stop(modulator, fm.stop);
    builder.sources.push(modulator);
  },
} satisfies Block<FrequencyModulation>;

// ---------- libs/synth/blocks/filter: the chain's filter ----------
// A biquad: its type, resonance (q, a plain ratio, 0.707 flat) and cutoff (hertz, or following the note: { key, max }); an envelope cabled to 'filter.frequency'
// sweeps it over the note from there, in semitones (blocks/envelope.ts, I1h). Its ports: 'filter', 'filter.frequency'
import { freq, val } from '../values.ts';
import type { Block, PlanBuilder } from '../plan-builder.ts';
import type { Biquad, Filter } from '../patch.ts';
import type { PlanNode } from '../../audio-plan/index.ts';
import { FILTER_SPECS } from '../params.ts';

const WEB_AUDIO_CUTOFF = 350; // Hz: a biquad's own, where a filter writes none

export default {
  key: 'filter',
  paramSpecs: FILTER_SPECS,
  plan(filter, builder) {
    const biquad = biquadOf(filter, builder, 'filter');
    builder.offer('filter', biquad);
  },
} satisfies Block<Filter>;

// A biquad at its type, resonance and cutoff: the chain's filter, or a noise's own.
// Its cutoff offered at its block's port '<block>.frequency'.
export function biquadOf(filter: Biquad, builder: PlanBuilder, block: string): PlanNode {
  const biquad = builder.node('biquad', block, { type: filter.type });
  const values = builder.values;
  if (filter.q !== undefined) {
    builder.value(biquad, 'Q', val(filter.q, values)); // a number, or a param's, as the Filter module's
  }
  const cutoff = filter.freq === undefined ? undefined : freq(filter.freq, builder.frequency, values);
  if (cutoff !== undefined) {
    builder.value(biquad, 'frequency', cutoff);
  }
  builder.offer(`${block}.frequency`, biquad, 'frequency', { base: cutoff ?? WEB_AUDIO_CUTOFF });
  return biquad;
}

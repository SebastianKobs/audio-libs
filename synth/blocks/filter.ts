// ---------- libs/synth/blocks/filter: the chain's filter ----------
// A biquad: its type, resonance (q, a plain ratio, 0.707 flat) and cutoff (hertz, or following the note: { key, max }); an envelope cabled to 'filter.frequency'
// sweeps it over the note from there, in semitones (blocks/envelope.ts, I1h). Its slope, 12 dB an octave, or 24: two biquads in series,
// their Qs as the filter block has them (libs/plan/blocks/), its cutoff on both. Its ports: 'filter', 'filter.frequency'
import { freq, val, wordOf } from '../values.ts';
import type { Block, PlanBuilder } from '../plan-builder.ts';
import type { Biquad, Filter } from '../patch.ts';
import type { PlanNode } from '../../audio-plan/index.ts';
import { FILTER_SPECS } from '../params.ts';
import { biquadQs } from '../../plan/blocks/index.ts';

const WEB_AUDIO_CUTOFF = 350; // Hz: a biquad's own, where a filter writes none

export default {
  key: 'filter',
  paramSpecs: FILTER_SPECS,
  plan(filter, builder) {
    const { first, last } = biquadsOf(filter, builder, 'filter');
    builder.offer('filter', first);
    if (last !== first) {
      builder.exit('filter', last);
    }
  },
} satisfies Block<Filter>;

// A filter's biquads at its type, resonance and cutoff, in series, one or two by its slope:
// the chain's filter, or a noise's own. Its sound in at the first, out of the last.
// Its cutoff offered on each at its block's port '<block>.frequency'.
export function biquadsOf(filter: Biquad, builder: PlanBuilder, block: string): { first: PlanNode; last: PlanNode } {
  const values = builder.values;
  const resonance = filter.q === undefined ? undefined : val(filter.q, values); // a number, or a param's, as the Filter module's
  const slope = wordOf(filter.slope ?? FILTER_SPECS.slope.default, values);
  const cutoff = filter.freq === undefined ? undefined : freq(filter.freq, builder.frequency, values);
  const stages = biquadQs({ type: filter.type, resonance, slope }).map((stageQ) => {
    const biquad = builder.node('biquad', block, { type: filter.type });
    if (stageQ !== undefined) {
      builder.value(biquad, 'Q', stageQ);
    }
    if (cutoff !== undefined) {
      builder.value(biquad, 'frequency', cutoff);
    }
    builder.offer(`${block}.frequency`, biquad, 'frequency', { base: cutoff ?? WEB_AUDIO_CUTOFF });
    return biquad;
  });
  for (const [index, stage] of stages.slice(1).entries()) {
    builder.link(stages[index]!, stage); // the one before it into it
  }
  return { first: stages[0]!, last: stages.at(-1)! }; // one at least, at any slope
}

// ---------- plan/effects: the effects, each a template ----------
// Utility, Filter, Limiter, Delay, Tape delay and Reverb, a YAML file each, its comments the reasons.
// The Tape delay built on the Delay (extends), merged by the planner.
// Each read as it loads, its shape checked, every failure said, naming its file.
// What every effect is, one input and one output, its form (form.ts).
// Handed to the planner, with the form; a theme's or a desk's presets on them.
import { templateOf, type WrittenTemplate } from '../planner/index.ts';
import { frozen } from '../../util/index.ts';
import delay from './delay.yaml';
import filter from './filter.yaml';
import limiter from './limiter.yaml';
import reverb from './reverb.yaml';
import tapeDelay from './tape-delay.yaml';
import utility from './utility.yaml';

export { EFFECT_FORM } from './form.ts';

// the effects, in the order a device view lists them
export const EFFECT_TEMPLATES: readonly WrittenTemplate[] = frozen([
  templateOf(utility, 'libs/plan/effects/utility.yaml'),
  templateOf(filter, 'libs/plan/effects/filter.yaml'),
  templateOf(limiter, 'libs/plan/effects/limiter.yaml'),
  templateOf(delay, 'libs/plan/effects/delay.yaml'),
  templateOf(tapeDelay, 'libs/plan/effects/tape-delay.yaml'),
  templateOf(reverb, 'libs/plan/effects/reverb.yaml'),
]);

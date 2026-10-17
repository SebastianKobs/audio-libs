// ---------- plan/synth/patch-plans: a patch planned from a file of instruments ----------
// By the patch's name:
//   - its chains: the patch alone, or its rack's pads, each its key;
//   - its instrument: a pool of voices of its voice card, or a drum rack, a pool for each pad.
// The planner of the file's voice cards: the modules' templates and the file's own.
import type { Plan } from '../format/index.ts';
import { Planner, type WrittenTemplate } from '../planner/index.ts';
import { SYNTH_FORMS } from './architecture-form.ts';
import { instrumentOf, type Chain } from './instrument.ts';
import type { Instruments } from './instruments-file.ts';
import { MODULE_TEMPLATES } from './modules.ts';

// the planner of voice cards: the modules' templates and those given, a file's own
export function cardPlanner(templates: readonly WrittenTemplate[]): Planner {
  return new Planner([...MODULE_TEMPLATES, ...templates], SYNTH_FORMS);
}
// a patch's instrument, planned: a patch or a rack the instruments have, by its name
export function patchPlan(name: string, instruments: Instruments): Plan {
  const kind = `${name} instrument`;
  const instrument = instrumentOf(kind, chainsOf(instruments, name), instruments.templates);
  return cardPlanner([...instruments.templates, instrument]).plan(kind);
}
// A patch's chains, as its instrument plays them: its rack's pads, each its key, or the patch
// alone. A patch the instruments have.
export function chainsOf(instruments: Instruments, name: string): Chain[] {
  const rack = instruments.racks[name];
  if (rack) {
    return rack.map(({ key, patch }) => ({ key, patch: instruments.patches[patch]! })); // a pad plays a patch the file has
  }
  return [{ patch: instruments.patches[name]! }];
}

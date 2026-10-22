// ---------- plan/desk/channel-form: what every channel is ----------
// A console's channel, its parts in one order:
//   1. its inserts, effects, any number;
//   2. its mute, a gain: what's silenced is cut here, after the inserts, as on a console;
//   3. its fader, a gain;
//   4. its pan, where it has one;
//   5. its sends, one child, taken after its mute (pre) or after its pan (post).
// Its one input. Its outputs: its way out, and a send's for each return its desk gives it.
import type { Form } from '../planner/index.ts';
import { EFFECT_FORM } from '../effects/index.ts';
import { frozen } from '../../../base/util/index.ts';

export const CHANNEL_FORM: Form = frozen<Form>({
  name: 'channel',
  inputs: ['in'],
  ordered: true,
  roles: [
    { role: 'insert', form: EFFECT_FORM.name },
    { role: 'mute', kind: 'gain', most: 1 },
    { role: 'fader', kind: 'gain', least: 1, most: 1 },
    { role: 'pan', kind: 'pan', most: 1 },
    { role: 'sends', most: 1 },
  ],
  wires: [
    { from: { parent: 'in' }, to: { role: 'insert' } },
    { from: { parent: 'in' }, to: { role: 'mute' } },
    { from: { parent: 'in' }, to: { role: 'fader' } },
    { from: { role: 'insert', output: 'out' }, to: { role: 'insert' } },
    { from: { role: 'insert', output: 'out' }, to: { role: 'mute' } },
    { from: { role: 'insert', output: 'out' }, to: { role: 'fader' } },
    { from: { role: 'mute', output: 'out' }, to: { role: 'fader' } },
    { from: { role: 'mute', output: 'out' }, to: { role: 'sends' } },
    { from: { role: 'fader', output: 'out' }, to: { role: 'pan' } },
    { from: { role: 'fader', output: 'out' }, to: { role: 'sends' } },
    { from: { role: 'fader', output: 'out' }, to: { parent: 'out' } },
    { from: { role: 'pan', output: 'out' }, to: { role: 'sends' } },
    { from: { role: 'pan', output: 'out' }, to: { parent: 'out' } },
    { from: { role: 'sends', output: 'tap' }, to: { parent: 'out' } },
  ],
  rules: [{ rule: 'no loops' }],
});

// ---------- plan/desk/desk-form: what every desk is ----------
// Channels only, each of the channel's form, by what feeds them and where they go:
//   - a channel, fed from outside the desk (a track), at least one, a pool of them one;
//   - a bus, a sum of what's routed into it, fed from outside too (a phrase played in);
//   - a return, fed by sends;
//   - the master, exactly one: the last sum, its way out the desk's.
// Its wires and rules:
//   - a way out into a bus or the master, a send into a return;
//   - no loops; every way out ending in the master.
import type { Form } from '../planner/index.ts';
import { frozen } from '../../util/index.ts';

// what a channel is on a desk, by what feeds it and where it goes
export type DeskRole = 'channel' | 'bus' | 'return' | 'master';

// the roles a way out or a send leaves from: every one but the master
const LEAVING: readonly DeskRole[] = ['channel', 'bus', 'return'];

export const DESK_FORM: Form = frozen<Form>({
  name: 'desk',
  outputs: ['out'],
  roles: [
    { role: 'channel', form: 'channel', least: 1 },
    { role: 'bus', form: 'channel' },
    { role: 'return', form: 'channel' },
    { role: 'master', form: 'channel', least: 1, most: 1 },
  ],
  wires: [
    { from: { parent: 'in' }, to: { role: 'channel' } },
    { from: { parent: 'in' }, to: { role: 'bus' } },
    ...LEAVING.flatMap((role) => [
      { from: { role, output: 'out' as const }, to: { role: 'bus' } },
      { from: { role, output: 'out' as const }, to: { role: 'master' } },
      { from: { role, output: 'tap' as const }, to: { role: 'return' } },
    ]),
    { from: { role: 'master', output: 'out' }, to: { parent: 'out' } },
  ],
  rules: [{ rule: 'no loops' }, { rule: 'ends in', role: 'master' }],
});

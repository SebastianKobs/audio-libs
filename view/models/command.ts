// ---------- view/models/command: what's done in a view, by address ----------
// A view never plays into the sound itself. It hands a command to the tool, which:
//   - a param's: records it through the sequencer and sets it, as every move is;
//   - a setting's: builds what's built again with it, not recorded, as a rebuild isn't
//     automation.
import type { Address } from '../../plan/format/index.ts';

// a value set by its address: a param's, or a setting's
export interface Command {
  readonly type: 'param' | 'setting';
  readonly address: Address;
  readonly value: number | string;
}

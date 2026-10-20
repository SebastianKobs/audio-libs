// ---------- view/device/readout/plan: a plan's jacks, as the views read it and edit it ----------
// Types only. Readout: the plan as it plays, by address (PlanReadout), how each value is set
// (Role), what a device does in its slot (Slot).
// Out: what's done, a command. A view never plays into the sound itself. It sends a command,
// as the app's message for the plan, and the tool:
//   - a param's: records it through the sequencer and sets it, as every move is;
//   - a setting's: builds what's built again with it, not recorded, as a rebuild isn't
//     automation.
import type { Plan } from '../../../plan/format/index.ts';
import type { Address } from '../../../util/index.ts';

// a value set by its address: a param's, or a setting's
export interface Command {
  readonly type: 'param' | 'setting';
  readonly address: Address;
  readonly value: number | string;
}
// How a value is set, as the tool says:
//   - live: set here, in a view;
//   - automated: by what its track plays, its source where it names one (distance);
//     recorded where its automation is in the arrangement's lanes;
//   - fixed: as it was built.
export interface Role {
  readonly by: 'live' | 'automated' | 'fixed';
  readonly source?: string;
  readonly recorded?: true;
}
// What a device does in its slot (job), and what sets it there, where its notes or the
// tool do (setBy), as the tool says.
export interface Slot {
  readonly job: string;
  readonly setBy?: string;
}
// What the views read of a plan as it plays, by address: its values, starts, roles, slots,
// copies and meters; a readout, what's done going out on the app's bus.
export interface PlanReadout {
  readonly plan: Plan;
  valueOf(address: Address): number | string | undefined;
  startOf(address: Address): number | string | undefined;
  roleOf(address: Address): Role;
  peakOf(address: Address, point?: string): number;
  readingOf(address: Address, reading: string): number;
  copiesOf(pool: Address): readonly Address[];
  slotOf(address: Address): Slot | undefined;
}

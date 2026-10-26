// A plan's readout of the tests' own, for the views' tests (a PlanReadout, view/device/readout):
//   - values, roles, slots, peaks and readings, each by its address as text, as given;
//   - a role every control live unless given, a value none unless given, a start the plan's own;
//   - the copies each pool has, by the pool's address as text, each a number.
import { paramAt, settingAt } from '../../../../plan/format/index.ts';
import { addressText } from '../../../../../base/util/index.ts';

export function planReadoutOf(
  plan,
  { values = {}, roles = {}, slots = {}, peaks = {}, readings = {}, copies = {} } = {},
) {
  return {
    plan,
    valueOf: (address) => values[addressText(address)],
    startOf: (address) => (paramAt(plan, address) ?? settingAt(plan, address))?.value,
    roleOf: (address) => roles[addressText(address)] ?? { by: 'live' },
    peakOf: (address, point) => peaks[[addressText(address), point].filter(Boolean).join(' ')] ?? 0,
    readingOf: (address, reading) => readings[`${addressText(address)} ${reading}`] ?? 0,
    copiesOf: (pool) => (copies[addressText(pool)] ?? []).map((number) => [...pool, String(number)]),
    slotOf: (address) => slots[addressText(address)],
  };
}

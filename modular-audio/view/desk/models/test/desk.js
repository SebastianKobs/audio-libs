// The small desk the desk views' tests read: plan/desk's test desk, planned, with the words a view
// shows its channels by (a bus's label, a return's short label).
import { planned } from '../../../../plan/desk/test/desks.js';
import { planReadoutOf } from '../../../device/readout/test/plan-readout.js';

const LABELS = { you: 'my playing', tap: 'my tap', sings: 'background' };
const SHORTS = { reverb: 'rev' };

export function studioPlan() {
  return planned(undefined, { labels: LABELS, shorts: SHORTS });
}
// its readout of the tests' own: values, roles, slots, peaks, readings and copies by address, as planReadoutOf takes them
export function studioReadout(told = {}) {
  return planReadoutOf(studioPlan(), told);
}

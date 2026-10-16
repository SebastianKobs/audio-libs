// ---------- automation/continued: automation continued as another from a time ----------
// As a knob turned while a param plays: from where it is at a time, on to the other.
//   1. What was planned from then cancelled, set where it is.
//   2. On its way: a ramp coming takes it on to its end by itself; a target the other
//      approaches approached from there; else the value the other holds, glided to.
//   3. The other's events after then.
import { eventTime, restartAt, type Automation } from './automation.ts';
import { levelAt } from './level-at.ts';

// s: the time constant a held value glides to a new one by, as a plugin smooths a knob
// against zipper noise
export const SMOOTHING = 0.05;

// the wanted automation from a time, from where the playing one has the param then
export function continuedAs(
  playing: readonly Automation[],
  wanted: readonly Automation[],
  at: number,
  smoothing = SMOOTHING,
): Automation[] {
  const coming = eventsAfter(wanted, at);
  return [...restartAt(levelAt(playing, at), at), ...onTheWay(wanted, at, coming, smoothing), ...coming];
}
// its events after a time
export function eventsAfter(automation: readonly Automation[], at: number): Automation[] {
  return automation.filter((event) => eventTime(event) > at);
}
// How it goes on from where it is:
//   - a ramp coming takes it on to its end by itself;
//   - a target the wanted automation approaches, approached from there;
//   - else the value it holds, glided to by the smoothing.
export function onTheWay(
  wanted: readonly Automation[],
  at: number,
  coming: readonly Automation[],
  smoothing: number,
): Automation[] {
  const next = coming[0];
  if (next && (next[0] === 'linear' || next[0] === 'exp')) {
    return [];
  }
  const approach = approachAt(wanted, at);
  if (approach) {
    return [['target', approach.value, at, approach.tc]];
  }
  return [['target', levelAt(wanted, at), at, smoothing]];
}
// the target an automation approaches at a time: its last event by then, if that's a target
export function approachAt(automation: readonly Automation[], at: number): { value: number; tc: number } | null {
  const last = automation.filter((event) => eventTime(event) <= at).at(-1);
  return last?.[0] === 'target' ? { value: last[1], tc: last[3] } : null;
}

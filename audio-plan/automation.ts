// ---------- libs/audio-plan/automation: a param's automation as Web Audio plays it, its level at a time ----------
// I1h1 (mockup/architecture/done.md): set at once; a ramp, linear or exponential, from where the event before left it to its value at its
// time, an exponential one from or to nothing holding, then jumping at its end, as Web Audio's does; a target approached from its start by
// its time constant. Where an envelope's release starts from at a note-off (libs/synth/shapes.ts), and what a surface draws
// (synth-surface/curve.ts); what another engine's automation would have to match
import type { Automation } from './plan.ts';
import { approach } from '../util/index.ts';

// where the level is after an event: its time and level there, and the target it approaches from then, if any
interface State {
  at: number;
  value: number;
  approach: { value: number; tc: number } | null;
}

// its level at a time from the plan's start
export function levelAt(automation: Automation[], t: number): number {
  let state: State = { at: 0, value: 0, approach: null };
  for (const event of automation) {
    const next = after(state, event);
    if (t < next.at) {
      return during(state, event, t);
    }
    state = next;
  }
  return held(state, t);
}

// where the level is once an event is done: a value as it starts, set, a ramp's end, or a target's start, approaching it from there
function after(state: State, event: Automation): State {
  if (event[0] === 'value') {
    return { at: state.at, value: event[1], approach: null };
  }
  if (event[0] === 'cancel') {
    return state; // what's planned after it is gone, so nothing planned follows it
  }
  if (event[0] === 'target') {
    return { at: event[2], value: held(state, event[2]), approach: { value: event[1], tc: event[3] } };
  }
  return { at: event[2], value: event[1], approach: null };
}
// its level before an event is done: on a ramp's way from where it was; else as it was left
function during(state: State, event: Automation, t: number): number {
  if (event[0] === 'linear' || event[0] === 'exp') {
    return ramp(event[0], state, { to: event[1], end: event[2] }, t);
  }
  return held(state, t);
}
// as it was left: held there, or approaching its target
function held({ at, value, approach: target }: State, t: number): number {
  if (!target) {
    return value;
  }
  return approach(value, target.value, t - at, target.tc);
}
// a ramp's level: a straight line, or an exponential one, which holds where it starts from or goes to nothing
function ramp(
  kind: 'linear' | 'exp',
  { at, value }: State,
  { to, end }: { to: number; end: number },
  t: number,
): number {
  const share = (t - at) / (end - at);
  if (kind === 'linear') {
    return value + (to - value) * share;
  }
  if (value * to <= 0) {
    return value;
  }
  return value * Math.pow(to / value, share);
}
// When an event is:
//   - a value: as the node is made, before anything;
//   - a cancel, and the rest: at its time.
export function eventTime(event: Automation): number {
  if (event[0] === 'value') {
    return -Infinity;
  }
  if (event[0] === 'cancel') {
    return event[1];
  }
  return event[2];
}
// a param restarted at a time: what was planned from then cancelled, set there to a level
export function restartAt(level: number, at: number): Automation[] {
  return [
    ['cancel', at],
    ['set', level, at],
  ];
}

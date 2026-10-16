// ---------- libs/web-audio-fx/timing: a port set by a timing, on a built module or a chain of them ----------
import type { Operation } from '../audio-plan/index.ts';
import { SMOOTHING } from '../automation/index.ts';
import type { Plan } from '../synth/index.ts';

// When a value lands on a port:
//   - 'now': at once, as a param's value is set;
//   - at: at once, at a time;
//   - glide: gliding there by a time constant, from a time to come (from) or from now.
export type Timing = 'now' | { at: number } | { glide: number; from?: number | undefined };
// what a value is set on at a port: a built module, or a chain of them
export interface Settable {
  set(port: string, value: number, timing?: Timing): void;
}
// where a value lands: a stage and its port
export interface Target {
  stage: Settable;
  port: string;
}

// a control moved with no timing of its own glides there, as a knob's move is smoothed
export const MOVED: Timing = Object.freeze({ glide: SMOOTHING });

// the operations that set a port of a plan by a timing, none where it has no such port; now, the context's
export function portSet(plan: Plan, port: string, value: number, timing: Timing, now: number): Operation[] {
  const offered = plan.ports[port];
  if (!offered) {
    return [];
  }
  if (timing === 'now') {
    return offered
      .filter((offering) => offering.param)
      .map((offering) => ({ id: offering.id, param: offering.param!, events: [['value', value]] })); // offering a param, as filtered
  }
  if ('at' in timing) {
    return plan.controls.set(port, value, timing.at, 0);
  }
  return plan.controls.set(port, value, timing.from ?? now, timing.glide);
}

// ---------- plan/blocks/envelope-curve: how an envelope moves, as automation ----------
// For a builder that builds an envelope as a curve. Stage by stage, on numbers its caller resolved:
//   1. its stages from its gate opening: from 0, after its delay up to 1 over its attack, held over
//      its hold, down to its sustain over its decay, held until its gate closes;
//   2. its release from its gate closing: from where it is then, down to 0 over its release.
// A stage with no time is set at once; with no delay and no attack it starts at 1.
// Its target says what a point of the curve is there, and the ramp each stage takes:
// its curve's (envelopeTarget()), or a caller's own.
import { eventTime, levelAt, shiftedBy, type Automation } from '../../automation/index.ts';
import { SILENCE } from '../../params/index.ts';
import type { EnvelopeCurve } from './envelope.ts';

// a stage of the curve
export type EnvelopeStage = 'attack' | 'decay' | 'release';
// What the curve moves: a point of it, 0 to 1, as a value there, and the ramp a stage takes there.
// A target's ramp approaches its point by the stage's time as a time constant.
export interface EnvelopeTarget {
  valueAt: (point: number) => number;
  rampOf: (stage: EnvelopeStage) => 'linear' | 'exp' | 'target';
}
// its stages' times, in seconds, and its sustain, a share of its top
export interface EnvelopeTimes {
  readonly delay: number;
  readonly attack: number;
  readonly hold: number;
  readonly decay: number;
  readonly sustain: number;
}

// Its stages from its gate opening, until its sustain.
// One that runs on (continuous) starts as its node is made, its first a value, not set at a time.
export function envelopeStages(
  { delay, attack, hold, decay, sustain }: EnvelopeTimes,
  target: EnvelopeTarget,
  continuous: boolean,
): Automation[] {
  const rises = delay > 0 || attack > 0;
  const first = target.valueAt(rises ? 0 : 1);
  const automation: Automation[] = [continuous ? ['value', first] : ['set', first, 0]];
  if (rises) {
    automation.push(
      ...held(target, 'attack', { level: target.valueAt(0), until: delay, length: attack }),
      stage(target, 'attack', 1, { start: delay, length: attack }),
    );
  }
  if (decay > 0 || sustain !== 1) {
    const start = delay + attack + hold;
    automation.push(
      ...held(target, 'decay', { level: target.valueAt(1), until: hold > 0 ? start : 0, length: decay }),
      stage(target, 'decay', sustain, { start, length: decay }),
    );
  }
  return automation;
}
// Its release from its gate closing: from where its stages have it then, down to 0 over its
// release; and when it has faded.
export function envelopeRelease(
  release: number,
  target: EnvelopeTarget,
  { from, stages }: { from: number; stages: Automation[] },
): { automation: Automation[]; faded: number } {
  return {
    automation: [cutAt(stages, from), stage(target, 'release', 0, { start: from, length: release })],
    faded: from + release,
  };
}

// Its whole curve from its gate opening at a time: its stages from then; released where its
// gate has closed, from where they have it then. Times from the start, as a builder's.
export function envelopeCurve(
  times: EnvelopeTimes,
  target: EnvelopeTarget,
  { opened, closed, release }: { opened: number; closed?: number | undefined; release: number },
): Automation[] {
  const stages = shiftedBy(envelopeStages(times, target, false), opened);
  if (closed === undefined) {
    return stages;
  }
  const before = stages.filter((event) => eventTime(event) <= closed);
  return [...before, ...envelopeRelease(release, target, { from: closed, stages }).automation];
}
// What its curve makes of its amount: a point's value, and the ramp each stage takes.
//   - exponential: up in a line, down straight in dB, never nearer 0 than the floor of silence;
//   - target: each stage approaching its point by its time as a time constant, as an analog's;
//   - linear: every stage in a line.
export function envelopeTarget(curve: EnvelopeCurve, amount: number): EnvelopeTarget {
  if (curve === 'exponential') {
    return {
      valueAt: (point) => floored(amount * point, amount),
      rampOf: (stage) => (stage === 'attack' ? 'linear' : 'exp'),
    };
  }
  const ramp = curve === 'target' ? 'target' : 'linear';
  return { valueAt: (point) => amount * point, rampOf: () => ramp };
}

// Where its stages have it as its gate closes:
//   - a ramp running then: cut there, at the level it has reached, so it still runs up to it;
//     a Web Audio ramp runs from the event before it, so dropped it would leave the level there;
//   - else set there.
function cutAt(stages: Automation[], from: number): Automation {
  const level = levelAt(stages, from);
  const running = stages.find((event) => eventTime(event) > from);
  if (running?.[0] === 'linear' || running?.[0] === 'exp') {
    return [running[0], level, from];
  }
  return ['set', level, from];
}
// A level held until a stage starts: set again there, as a ramp runs from the event before it.
// None where nothing is held, the stage is set at once, or it approaches from where it is.
function held(
  target: EnvelopeTarget,
  name: EnvelopeStage,
  { level, until, length }: { level: number; until: number; length: number },
): Automation[] {
  if (target.rampOf(name) === 'target') {
    return [];
  }
  return until > 0 && length > 0 ? [['set', level, until]] : [];
}
// a stage: reaching its point at its end by its target's ramp, or, with no time, set there at its start
function stage(
  target: EnvelopeTarget,
  name: EnvelopeStage,
  point: number,
  { start, length }: { start: number; length: number },
): Automation {
  const value = target.valueAt(point);
  if (length === 0) {
    return ['set', value, start];
  }
  const ramp = target.rampOf(name);
  if (ramp === 'target') {
    return ['target', value, start, length];
  }
  return [ramp, value, start + length];
}
// a value never nearer 0 than the floor of silence, on its amount's side: an exponential ramp's
// ends, which can't reach 0 or cross it
function floored(value: number, amount: number): number {
  const side = amount < 0 ? -1 : 1;
  return side * Math.max(Math.abs(value), SILENCE);
}

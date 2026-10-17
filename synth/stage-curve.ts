// ---------- libs/synth/stage-curve: how today's synth's envelope moves, as automation ----------
// The building blocks' curve as it was before LAY14a6 drew it as an ARP's, kept for today's synth,
// which the instrument editor draws, until LAY15 and LAY16 take it out. Stage by stage, on numbers
// its caller resolved:
//   1. its stages from its gate opening: from 0, after its delay up to 1 over its attack, held over
//      its hold, down to its sustain over its decay, held until its gate closes;
//   2. its release from its gate closing: from where it is then, down to 0 over its release.
// A stage with no time is set at once; with no delay and no attack it starts at 1.
// Its target says what a point of the curve is there, and the ramp each stage takes: the synth's
// own, by the port it moves (shapes.ts).
import { cutAt, type Automation } from '../automation/index.ts';
import type { EnvelopeTimes } from '../plan/blocks/index.ts';

// a stage of the curve
export type EnvelopeStage = 'attack' | 'decay' | 'release';
// What the curve moves: a point of it, 0 to 1, as a value there, and the ramp a stage takes there.
// A target's ramp approaches its point by the stage's time as a time constant.
export interface EnvelopeTarget {
  valueAt: (point: number) => number;
  rampOf: (stage: EnvelopeStage) => 'linear' | 'exp' | 'target';
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
      ...stage(target, 'attack', 1, { start: delay, length: attack }),
    );
  }
  if (decay > 0 || sustain !== 1) {
    const start = delay + attack + hold;
    automation.push(
      ...held(target, 'decay', { level: target.valueAt(1), until: hold > 0 ? start : 0, length: decay }),
      ...stage(target, 'decay', sustain, { start, length: decay }),
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
    automation: [cutAt(stages, from), ...stage(target, 'release', 0, { start: from, length: release })],
    faded: from + release,
  };
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
): Automation[] {
  const value = target.valueAt(point);
  if (length === 0) {
    return [['set', value, start]];
  }
  const ramp = target.rampOf(name);
  if (ramp === 'target') {
    return [['target', value, start, length]];
  }
  return [[ramp, value, start + length]];
}

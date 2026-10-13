// ---------- libs/synth/stages: an envelope's shape as automation on its target, stage by stage ----------
// I1h (mockup/architecture/done.md): its shape from 0 at the note's start, after its delay up to 1 over its attack, held over its hold,
// down to its sustain over its decay, held until the note-off; from there, from where it is then, down to 0 over its release. A stage with
// no time set at once; with no delay and no attack it starts at 1; with no release it rings on past the note-off. Its target (shapes.ts)
// says what a point of the shape is there, and how each stage gets there: straight in its target's scale
import { time, val, type Time, type Values } from './values.ts';
import type { Envelope } from './patch.ts';
import { levelAt, type Automation } from '../audio-plan/index.ts';
import { ENVELOPE_SPECS } from './params.ts';

// a stage of a shape
export type Stage = 'attack' | 'decay' | 'release';
// what a shape moves: its target's value at a point of it, 0 to 1, and the ramp a stage takes there
export interface Target {
  valueAt: (point: number) => number;
  rampOf: (stage: Stage) => 'linear' | 'exp';
}
// what the stages need of the note: its values, whether it runs on, and its target
interface Note {
  values: Values;
  continuous: boolean;
  target: Target;
}

// its stages from the note's start, until its sustain
export function stagesOf(envelope: Envelope, { values, continuous, target }: Note): Automation[] {
  const [delay, attack, hold, decay] = [envelope.delay, envelope.attack, envelope.hold, envelope.decay].map((written) =>
    timeOf(written, values),
  ) as [number, number, number, number];
  const sustain = envelope.sustain === undefined ? ENVELOPE_SPECS.sustain.default : val(envelope.sustain, values);
  const rises = delay > 0 || attack > 0;
  const first = target.valueAt(rises ? 0 : 1);
  const automation: Automation[] = [continuous ? ['value', first] : ['set', first, 0]];
  if (rises) {
    automation.push(
      ...held(target.valueAt(0), delay, attack),
      stage(target, 'attack', 1, { start: delay, length: attack }),
    );
  }
  if (decay > 0 || sustain !== 1) {
    const start = delay + attack + hold;
    automation.push(
      ...held(target.valueAt(1), hold > 0 ? start : 0, decay),
      stage(target, 'decay', sustain, { start, length: decay }),
    );
  }
  return automation;
}
// its release from a note-off: from where its stages have it then, down to 0 over its release, and when it has faded
export function releaseOf(
  envelope: Envelope,
  { values, target }: Note,
  { from, stages }: { from: number; stages: Automation[] },
): { automation: Automation[]; faded: number } {
  const length = timeOf(envelope.release, values);
  return {
    automation: [cutAt(stages, from), stage(target, 'release', 0, { start: from, length })],
    faded: from + length,
  };
}

// where its stages have it at a note-off: a ramp running then cut there, at the level it has reached, so it still runs up to it, a Web
// Audio ramp running from the event before it, and dropped would leave the level where that event left it (I1i3); else set there
function cutAt(stages: Automation[], from: number): Automation {
  const level = levelAt(stages, from);
  const running = stages.find((event) => event[0] !== 'value' && event[0] !== 'cancel' && event[2] > from);
  if (running?.[0] === 'linear' || running?.[0] === 'exp') {
    return [running[0], level, from];
  }
  return ['set', level, from];
}
// a level held until a stage starts: set again there, since a ramp runs from the event before it (I1h2a); none where nothing is held, or
// the stage is set at once
function held(level: number, until: number, length: number): Automation[] {
  return until > 0 && length > 0 ? [['set', level, until]] : [];
}
// a stage's time; none, no time
function timeOf(written: Time | undefined, values: Values): number {
  return written === undefined ? 0 : time(written, values);
}
// a stage: reaching its point at its end by its target's ramp, or, with no time, set there at its start
function stage(
  target: Target,
  name: Stage,
  point: number,
  { start, length }: { start: number; length: number },
): Automation {
  const value = target.valueAt(point);
  if (length === 0) {
    return ['set', value, start];
  }
  return [target.rampOf(name), value, start + length];
}

// ---------- libs/synth/stages: an envelope's shape as automation on its target, stage by stage ----------
// I1h (mockup/architecture/done.md): its times written in the synth's terms, resolved for the note; its curve the envelope block's
// (libs/plan/blocks/, LAY6b): from 0 at the note's start, after its delay up to 1 over its attack, held over its hold, down to its sustain
// over its decay, held until the note-off; from there down to 0 over its release. Its target (shapes.ts) says what a point of the shape is
// there, and how each stage gets there: straight in its target's scale
import { time, val, type Time, type Values } from './values.ts';
import type { Envelope } from './patch.ts';
import type { Automation } from '../automation/index.ts';
import { ENVELOPE_SPECS } from '../plan/blocks/index.ts';
import { envelopeRelease, envelopeStages, type EnvelopeTarget } from './stage-curve.ts';

// what the stages need of the note: its values, whether it runs on, and its target
interface Note {
  values: Values;
  continuous: boolean;
  target: EnvelopeTarget;
}

// its stages from the note's start, until its sustain
export function stagesOf(envelope: Envelope, { values, continuous, target }: Note): Automation[] {
  const sustain = envelope.sustain === undefined ? ENVELOPE_SPECS.sustain.default : val(envelope.sustain, values);
  const times = {
    delay: timeOf(envelope.delay, values),
    attack: timeOf(envelope.attack, values),
    hold: timeOf(envelope.hold, values),
    decay: timeOf(envelope.decay, values),
    sustain,
  };
  return envelopeStages(times, target, continuous);
}
// its release from a note-off: from where its stages have it then, down to 0 over its release, and when it has faded
export function releaseOf(
  envelope: Envelope,
  { values, target }: Note,
  { from, stages }: { from: number; stages: Automation[] },
): { automation: Automation[]; faded: number } {
  return envelopeRelease(timeOf(envelope.release, values), target, { from, stages });
}

// a stage's time; none, no time
function timeOf(written: Time | undefined, values: Values): number {
  return written === undefined ? 0 : time(written, values);
}

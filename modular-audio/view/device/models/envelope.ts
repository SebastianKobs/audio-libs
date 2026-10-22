// ---------- view/device/models/envelope: an envelope's curve, as a view draws it ----------
// From its knobs as they're set, the curve the instrument plays (libs/modular-audio/plan/blocks/'s, an ARP's):
//   1. its stages from its gate opening: after its delay up to its top, held, onto its sustain;
//   2. released at the note's end, from where it is then; a trigger's running on past it.
// Sampled over a time, a level each step, a share of its amount; where its delay ends and the
// note's end, marked.
// Where it's asked no note's end or length, drawn as long as it takes: held until it has
// settled onto its sustain, half a second at least, then its release.
import { Levels } from '../../../../base/automation/index.ts';
import { envelopeCurve } from '../../../plan/blocks/index.ts';
import { Choice } from './choice.ts';
import type { Device } from './device.ts';
import { Knob } from './knob.ts';

// an envelope's curve as it's drawn: a level a step, from its gate opening; where its delay
// ends; the note's end, none for a trigger's
export interface EnvelopeDrawing {
  readonly levels: readonly number[];
  readonly step: number;
  readonly delay: number;
  readonly noteOff: number | null;
}

const HELD_AT_LEAST = 0.5; // s: a note drawn held, where it's asked none

// An envelope's curve from its device's knobs: the note's end, and how long and how fine it's drawn.
export function envelopeDrawing(
  device: Device,
  { noteOff: asked, length: askedLength, steps }: { noteOff?: number; length?: number; steps: number },
): EnvelopeDrawing {
  // a stage's knob, by its name; 0 where it has none
  const stage = (name: string): number => {
    const control = device.controls.find((each) => each.name === name);
    return control instanceof Knob ? control.value : 0;
  };
  const delay = stage('delay');
  const release = stage('release');
  const mode = device.controls.find(({ name }) => name === 'mode');
  const trigger = mode instanceof Choice && mode.value === 'trigger';
  const times = {
    delay,
    attack: stage('attack'),
    hold: stage('hold'),
    decay: stage('decay'),
    sustain: stage('sustain'),
  };
  const settled = times.delay + times.attack + times.hold + times.decay;
  const noteOff = asked ?? Math.max(HELD_AT_LEAST, settled);
  const length = askedLength ?? noteOff + release;
  const closed = trigger ? undefined : noteOff;
  const curve = envelopeCurve(times, 1, { opened: 0, closed, release });
  const levels = new Levels(curve);
  const step = length / steps;
  return {
    levels: Array.from({ length: steps + 1 }, (_, index) => levels.at(index * step)),
    step,
    delay,
    noteOff: trigger ? null : noteOff,
  };
}

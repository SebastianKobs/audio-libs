// ---------- dsp/oscillators/phase-distortion-voice: one line of a CZ, a cosine through a bent phase ----------
import { noteAt, paramAt, phaseStep, type Voice, type VoiceParams } from './voice.ts';

/** What a phase distortion voice is made with. */
export interface PhaseDistortionSetup {
  // where in its period it starts, 0 to 1; 0 unless given
  phase?: number;
}

const SQUARE = 1; // the wave's index: 0 the saw, 1 the square
const KNEE_FLOOR = 0.01; // of the period [est.]
const KNEE_SAMPLES = 2; // never narrower, so the fast part doesn't fold

/**
 * A cosine read through a phase bent at a knee (Casio's phase distortion).
 * The dcw moves the knee from the middle of the period (a sine) toward its start (a saw),
 * or, for a square, runs each half of the cosine through fast and then holds it.
 * The wave meets its knee and its turn with no kink, so it stays sine-like, with no fizz.
 */
export class PhaseDistortionVoice implements Voice {
  #phase: number;

  constructor({ phase = 0 }: PhaseDistortionSetup = {}) {
    this.#phase = phase;
  }

  render(out: Float32Array, from: number, to: number, params: VoiceParams, sampleRate: number): void {
    for (let i = from; i < to; i++) {
      const step = phaseStep(noteAt(params, i), sampleRate);
      const dcw = Math.min(1, Math.max(0, paramAt(params, 'dcw', i)));
      const knee = 0.5 * (1 - dcw) + dcw * Math.max(KNEE_FLOOR, KNEE_SAMPLES * step);
      const square = Math.round(paramAt(params, 'wave', i)) === SQUARE;
      const bent = square ? squareBent(this.#phase, knee) : sawBent(this.#phase, knee);
      out[i] = -Math.cos(2 * Math.PI * bent);
      this.#phase += step;
      this.#phase -= Math.floor(this.#phase);
    }
  }
}

// the phase run through to the knee as the first half of the cosine, then the rest in what is left
function sawBent(phase: number, knee: number): number {
  return phase < knee ? (phase * 0.5) / knee : 0.5 + ((phase - knee) * 0.5) / (1 - knee);
}
// each half of the period gets half a cosine, run through in the knee's time, then held
function squareBent(phase: number, knee: number): number {
  const half = phase < 0.5 ? 0 : 0.5;
  return half + Math.min(0.5, ((phase - half) * 0.5) / knee);
}

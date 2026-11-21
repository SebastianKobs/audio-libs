// ---------- dsp/oscillators/operator-voice: phase modulation, up to four operators ----------
import { OPERATOR_ALGORITHMS } from './operator-algorithms.ts';
import { noteAt, paramAt, phaseStep, type Voice, type VoiceParams } from './voice.ts';

/** What an operator voice is made with; each part optional. */
export interface OperatorSetup {
  // routes[k - 1]: the operators that modulate operator k, each higher than k; the first algorithm's unless given
  routes?: readonly (readonly number[])[];
  // the operators heard
  carriers?: readonly number[];
  // the operator that feeds itself, 4 unless given
  feedbackOn?: number;
  // each operator's start phase, 0 to 1, handed in so no random is drawn here
  phases?: readonly number[];
}

const OPERATORS = 4;
const TURN = 2 * Math.PI;

// the TX81Z's eight waves as remembered, by index; each from a phase of 0 to 1 to a sample
const WAVES: readonly ((phase: number) => number)[] = [
  (phase) => Math.sin(TURN * phase),
  (phase) => {
    const sine = Math.sin(TURN * phase);
    return sine * Math.abs(sine);
  },
  (phase) => (phase < 0.5 ? Math.sin(TURN * phase) : 0),
  (phase) => (phase < 0.5 ? Math.sin(TURN * phase) ** 2 : 0),
  (phase) => (phase < 0.5 ? Math.sin(2 * TURN * phase) : 0),
  (phase) => {
    const doubled = Math.sin(2 * TURN * phase);
    return phase < 0.5 ? doubled * Math.abs(doubled) : 0;
  },
  (phase) => (phase < 0.5 ? Math.abs(Math.sin(2 * TURN * phase)) : 0),
  (phase) => (phase < 0.5 ? Math.sin(2 * TURN * phase) ** 2 : 0),
];

/**
 * Up to four operators, each a wave at a ratio of the note.
 * A modulator shifts a carrier's phase, not its frequency, so the pitch holds as the brightness moves.
 * One operator may feed itself: its output after the level, averaged over two samples, as Yamaha's chips do.
 * The carriers summed are the sound.
 * Levels, ratios and waves are params; a modulator's level is its index in radians, a carrier's its loudness.
 */
export class OperatorVoice implements Voice {
  readonly #routes: readonly (readonly number[])[];
  readonly #carriers: readonly number[];
  readonly #feedbackOn: number;
  readonly #phase: number[];
  readonly #output = new Float64Array(OPERATORS + 1); // this sample's, by operator number (index 0 unused)
  readonly #last = new Float64Array(OPERATORS + 1); // each one's output a sample ago
  readonly #before = new Float64Array(OPERATORS + 1); // and two

  constructor({
    routes = OPERATOR_ALGORITHMS[0]!.routes,
    carriers = OPERATOR_ALGORITHMS[0]!.carriers,
    feedbackOn = OPERATORS,
    phases = [],
  }: OperatorSetup = {}) {
    routes.forEach((sources, index) =>
      sources.forEach((source) => {
        if (source <= index + 1) {
          throw new Error(`An operator is modulated only by a higher one: ${source} into ${index + 1}`);
        }
      }),
    );
    this.#routes = routes;
    this.#carriers = carriers;
    this.#feedbackOn = feedbackOn;
    this.#phase = Array.from({ length: OPERATORS }, (_, index) => phases[index] ?? 0);
  }

  render(out: Float32Array, from: number, to: number, params: VoiceParams, sampleRate: number): void {
    for (let i = from; i < to; i++) {
      const note = noteAt(params, i);
      for (let operator = OPERATORS; operator >= 1; operator--) {
        this.#sampleOf(operator, i, note, params, sampleRate);
      }
      let sample = 0;
      for (const carrier of this.#carriers) {
        sample += this.#output[carrier]!;
      }
      out[i] = sample;
    }
  }

  // operator k's sample: its phase moved by what modulates it, through its wave, at its level; then its phase on
  #sampleOf(operator: number, i: number, note: number, params: VoiceParams, sampleRate: number): void {
    let modulation = 0;
    for (const source of this.#routes[operator - 1] ?? []) {
      modulation += this.#output[source]!;
    }
    if (operator === this.#feedbackOn) {
      modulation += paramAt(params, 'feedback', i) * ((this.#last[operator]! + this.#before[operator]!) / 2);
    }
    const wave = WAVES[Math.min(WAVES.length - 1, Math.max(0, Math.round(paramAt(params, `wave${operator}`, i))))]!;
    const phase = this.#phase[operator - 1]!;
    const sample = paramAt(params, `level${operator}`, i) * wave(fractionOf(phase + modulation / TURN));
    this.#before[operator] = this.#last[operator]!;
    this.#last[operator] = sample;
    this.#output[operator] = sample;
    const frequency =
      note * paramAt(params, `ratio${operator}`, i) * 2 ** (paramAt(params, `detune${operator}`, i) / 1200);
    this.#phase[operator - 1] = fractionOf(phase + phaseStep(frequency, sampleRate));
  }
}

function fractionOf(value: number): number {
  return value - Math.floor(value);
}

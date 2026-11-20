// ---------- libs/dsp/crusher/crusher: a bit and sample-rate reducer, on sample arrays ----------

/** What a channel carries from one block to the next: where its rate's phase is, and the sample it holds. */
export interface CrusherState {
  phase: number;
  held: number;
}

/** What a block is crushed to: the bits its steps are, the rate samples are taken at in Hz, the rate it plays at. */
export interface CrusherSettings {
  bits: number;
  rate: number;
  sampleRate: number;
}

/**
 * A channel crushed into `output`: a sample taken each time its rate's phase runs out, the first at once,
 * held until the next, and rounded to a step of 2 / 2^bits (full scale, -1 to 1, in 2^bits steps).
 * `state` is kept for the next block; a sample `input` lacks counts as silence.
 */
export function crushed(
  input: ArrayLike<number>,
  output: Float32Array,
  state: CrusherState,
  { bits, rate, sampleRate }: CrusherSettings,
): void {
  const step = 2 ** (1 - bits);
  const turn = Math.min(1, Math.max(0, rate / sampleRate));
  for (let i = 0; i < output.length; i++) {
    if (state.phase <= 0) {
      state.phase += 1;
      state.held = Math.round((input[i] ?? 0) / step) * step;
    }
    state.phase -= turn;
    output[i] = state.held;
  }
}

/** A crusher a channel: each channel of a block crushed with a state of its own, kept from block to block. */
export class Crusher {
  readonly #sampleRate: number;
  readonly #states: CrusherState[] = []; // a channel's each, made as its channel first comes

  constructor({ sampleRate }: { sampleRate: number }) {
    this.#sampleRate = sampleRate;
  }

  /** A block of channels crushed into `outputs`; a channel with no input is silent. */
  render(
    inputs: readonly (ArrayLike<number> | undefined)[],
    outputs: readonly Float32Array[],
    { bits, rate }: { bits: number; rate: number },
  ): void {
    outputs.forEach((output, channel) => {
      const input = inputs[channel];
      if (!input) {
        output.fill(0);
        return;
      }
      const state = (this.#states[channel] ??= { phase: 0, held: 0 });
      crushed(input, output, state, { bits, rate, sampleRate: this.#sampleRate });
    });
  }
}

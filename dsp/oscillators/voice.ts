// ---------- libs/dsp/oscillators/voice: what a voice is handed, and the numbers they all read ----------

/** A voice's params for a block: each a number for the whole block, or an array a sample each (a-rate). */
export type VoiceParams = Readonly<Record<string, number | ArrayLike<number>>>;

/** A source of samples that renders from one frame to another at its params. */
export interface Voice {
  /** Frames `from` to `to` of `out` written at `params`; the rest of `out` left as it is. */
  render(out: Float32Array, from: number, to: number, params: VoiceParams, sampleRate: number): void;
}

const NYQUIST = 0.5; // a phase's most per sample

/** A param's value at a frame: the block's one number, or the array's sample for that frame. */
export function paramAt(params: VoiceParams, name: string, frame: number): number {
  const value = params[name];
  if (typeof value === 'number') {
    return value;
  }
  if (!value || value.length === 0) {
    return 0;
  }
  return (value.length > 1 ? value[frame] : value[0]) ?? 0;
}

/** The note's frequency at a frame, its detune in cents applied. */
export function noteAt(params: VoiceParams, frame: number): number {
  return paramAt(params, 'frequency', frame) * 2 ** (paramAt(params, 'detune', frame) / 1200);
}

/** How far a phase of 0 to 1 moves each sample at a frequency: never backwards, never past Nyquist. */
export function phaseStep(frequency: number, sampleRate: number): number {
  return Math.min(NYQUIST, Math.max(0, frequency / sampleRate));
}

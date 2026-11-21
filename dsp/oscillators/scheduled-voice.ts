// ---------- dsp/oscillators/scheduled-voice: a voice made a source, started and stopped at its times ----------
import type { Voice, VoiceParams } from './voice.ts';

/** What the audio thread says of itself with each block: its sample rate and the context's time now, in seconds. */
export interface BlockClock {
  sampleRate: number;
  currentTime: number;
}

/**
 * A voice told when to start and when to stop, in the context's seconds, as Web Audio's own sources are.
 * Silent until its start, sounding from the first frame at it, silent from its stop.
 * Once it has stopped it asks to be let go, so a source stopped never sounds again.
 * One mono output, copied to every channel.
 */
export class ScheduledVoice {
  readonly #voice: Voice;
  #start = Infinity; // s, the context's: not started until told
  #stop = Infinity;

  constructor(voice: Voice) {
    this.#voice = voice;
  }

  /**
   * A message from the page: `{ start }` sets the start, `{ stop }` the stop, which is never taken back.
   * A message that isn't a time, or isn't an object, is left out: it arrives from another thread.
   */
  told(message: unknown): void {
    const { start, stop } = (message ?? {}) as { start?: unknown; stop?: unknown };
    if (isTime(start)) {
      this.#start = start;
    }
    if (isTime(stop)) {
      this.#stop = Math.min(this.#stop, stop);
    }
  }

  /** One block rendered into the first output; false once it has stopped, so the audio thread can drop it. */
  process(
    outputs: readonly (readonly Float32Array[])[],
    parameters: VoiceParams,
    { sampleRate, currentTime }: BlockClock,
  ): boolean {
    const channels = outputs[0];
    const mono = channels?.[0];
    if (!channels || !mono) {
      return true;
    }
    const frameOf = (time: number): number =>
      Math.min(mono.length, Math.max(0, Math.round((time - currentTime) * sampleRate)));
    const from = frameOf(this.#start);
    const to = frameOf(this.#stop);
    mono.fill(0);
    if (from < to) {
      this.#voice.render(mono, from, to, parameters, sampleRate);
    }
    for (const channel of channels.slice(1)) {
      channel.set(mono);
    }
    return to >= mono.length;
  }
}

// a message's start or stop, in seconds: a number that is one
function isTime(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

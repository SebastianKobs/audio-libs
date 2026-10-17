// ---------- build/web-audio/power: the audio's power, an output and its audio context ----------
// Made as the audio starts, with the output after what's built and the context it plays in.
// Pause: a hidden tab's, or a transport's stop. The output fades out, and the audio context
// is suspended once it's quiet.
// Resume: back on the tab, or after the browser stopped the sound (a phone locking, say).
// Faded in again, never at full volume: from where the fade got to if the context hadn't
// stopped yet, else from silence, the context resumed.
import type { Output } from './output.ts';

const STOP_AFTER = 400; // ms before a pause suspends the context: the fade out has gone quiet

export class AudioPower {
  readonly #output: Pick<Output, 'fadeIn' | 'fadeOut'>;
  readonly #context: Pick<AudioContext, 'state' | 'suspend' | 'resume'>;
  // suspends the context once the output has faded
  #pausing: ReturnType<typeof setTimeout> | undefined;

  constructor({
    output,
    context,
  }: {
    output: Pick<Output, 'fadeIn' | 'fadeOut'>;
    context: Pick<AudioContext, 'state' | 'suspend' | 'resume'>;
  }) {
    this.#output = output;
    this.#context = context;
  }
  // Nothing while the context isn't running.
  pause(): void {
    if (this.#context.state !== 'running') {
      return;
    }
    this.#output.fadeOut();
    this.#pausing = setTimeout(() => {
      this.#pausing = undefined;
      void this.#context.suspend(); // fire and forget: nothing waits for it
    }, STOP_AFTER);
  }
  resume(): void {
    if (this.#pausing) {
      clearTimeout(this.#pausing);
      this.#pausing = undefined;
      this.#output.fadeIn();
      return;
    }
    if (this.#context.state === 'running') {
      return;
    }
    this.#output.fadeIn({ fromSilence: true });
    void this.#context.resume(); // fire and forget, as suspend()
  }
}

// ---------- build/web-audio/power: the audio's power, started, paused and resumed ----------
// Start: on the first touch, as browsers ask.
//   1. The engine made, the audio context on the clock's time (its owner's, handed in).
//   2. What's built built in it by the Web Audio builder, into the output after it, faded in.
//   3. The clock's beat grid on the audio's time.
//   4. Told to whoever listens: a background struck then.
// Once started, a start turns it back on; none while paused.
// Pause: a transport's stop. The output fades out, and the audio context is suspended once
// it's quiet.
// Resume: faded in again, never at full volume: from where the fade got to if the context
// hadn't stopped yet, else from silence, the context resumed; started if it hadn't.
// Wake: back on after the browser stopped the sound (a phone locking, say), never started by it.
import type { Clock } from '../../clock/index.ts';
import type { Plan } from '../../plan/format/index.ts';
import { Events } from '../../util/index.ts';
import type { WebAudioBuilt } from './built.ts';
import { WebAudioBuilder } from './builder.ts';
import type { ClockedContext } from './context.ts';
import { Output } from './output.ts';

// What the power is made with:
//   - engine(): the engine, made at the first start, its owner's (an audio session set first);
//   - build(): what's built, by the function handed it, as a desk builds itself;
//   - beat(): a beat's length now, for synced times; clock: put on the audio's time.
export interface AudioPowerMaking {
  readonly engine: () => ClockedContext;
  readonly build: (make: (plan: Plan) => WebAudioBuilt) => void;
  readonly beat: () => number;
  readonly clock: Pick<Clock, 'useAudio'>;
}

const STOP_AFTER = 400; // ms before a pause suspends the context: the fade out has gone quiet

export class AudioPower {
  readonly #making: AudioPowerMaking;
  readonly #events = new Events<{ start: [] }>();
  #engine: ClockedContext | null = null; // made at the first start
  #output: Output | null = null; // after what's built, faded in as the audio starts
  #paused = false; // a transport's stop
  // suspends the context once the output has faded
  #pausing: ReturnType<typeof setTimeout> | undefined;

  constructor(making: AudioPowerMaking) {
    this.#making = making;
  }
  // whether the audio has started: it starts on the first touch
  get started(): boolean {
    return this.#engine !== null;
  }
  get paused(): boolean {
    return this.#paused;
  }
  get engine(): ClockedContext | null {
    return this.#engine;
  }
  // the output after what's built, faded in as the audio starts, never at full volume
  get output(): Output | null {
    return this.#output;
  }
  // The audio started, once, then told; back on once started. Neither while paused.
  start(): void {
    if (this.#paused) {
      return;
    }
    if (this.#engine) {
      this.#on();
      return;
    }
    const engine = this.build();
    // the beat grid on the audio's time from now, before a background's notes
    this.#making.clock.useAudio(engine.audioContext);
    this.#events.emit('start');
  }
  // The engine made and what's built built in it, into the output, with no clock on it and
  // nothing told, as a desk's offline render asks.
  build(): ClockedContext {
    const engine = this.#making.engine();
    const context = engine.audioContext;
    this.#engine = engine;
    this.#output = new Output(context);
    const builder = new WebAudioBuilder({ context, beat: this.#making.beat });
    const into = this.#output.node;
    this.#making.build((plan) => builder.build(plan, { into }));
    return engine;
  }
  pause(): void {
    this.#paused = true;
    this.#off();
  }
  // going on: the sound faded in from where it stopped; started if it hadn't, as a touch
  resume(): void {
    this.#paused = false;
    this.start();
  }
  // back on after the browser stopped the sound; never started by it
  wake(): void {
    this.#on();
  }
  // the audio's start, once
  onStart(listener: () => void): void {
    this.#events.on('start', listener);
  }

  // Faded out, then suspended once quiet. Nothing while the context isn't running.
  #off(): void {
    const context = this.#engine?.audioContext;
    if (context?.state !== 'running') {
      return;
    }
    this.#output!.fadeOut(); // made with the engine
    this.#pausing = setTimeout(() => {
      this.#pausing = undefined;
      void context.suspend(); // fire and forget: nothing waits for it
    }, STOP_AFTER);
  }
  // Faded in: from where it got to if not yet suspended, else from silence, resumed.
  #on(): void {
    if (!this.#engine) {
      return;
    }
    if (this.#pausing) {
      clearTimeout(this.#pausing);
      this.#pausing = undefined;
      this.#output!.fadeIn(); // made with the engine
      return;
    }
    const context = this.#engine.audioContext;
    if (context.state === 'running') {
      return;
    }
    this.#output!.fadeIn({ fromSilence: true });
    void context.resume(); // fire and forget, as suspend()
  }
}

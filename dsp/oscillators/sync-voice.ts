// ---------- dsp/oscillators/sync-voice: hard sync, a slave oscillator reset by a master ----------
import { noteAt, paramAt, phaseStep, type Voice, type VoiceParams } from './voice.ts';

const SQUARE = 1; // the wave's index: 0 sawtooth, 1 square
const HALF = 0.5; // a period's half: where a square flips

/**
 * A master phase at the note and a slave phase `sync` semitones above it, reset at each turn of the master's.
 * The slave's wave is what is heard, a sawtooth or a square.
 * Every jump in it (the slave's own turn, a square's flip, a reset) is smoothed by a two-sample polyBLEP,
 * a band-limited step as a small polynomial, so it doesn't alias as a naive one does.
 * It is heard a sample late for that.
 */
export class SyncVoice implements Voice {
  #master = 0;
  #slave = 0;
  #held = 0; // the sample before, corrected, heard next
  #current = 0;

  render(out: Float32Array, from: number, to: number, params: VoiceParams, sampleRate: number): void {
    for (let i = from; i < to; i++) {
      const note = noteAt(params, i);
      const masterStep = phaseStep(note, sampleRate);
      const slaveStep = phaseStep(note * 2 ** (Math.max(0, paramAt(params, 'sync', i)) / 12), sampleRate);
      const square = Math.round(paramAt(params, 'wave', i)) === SQUARE;
      this.#step(masterStep, slaveStep, square);
      out[i] = this.#held;
      this.#held = this.#current;
    }
  }

  // one sample on: the phases moved, each jump since the sample before smoothed
  #step(masterStep: number, slaveStep: number, square: boolean): void {
    const wave = square ? squareAt : sawAt;
    this.#current = 0;
    this.#master += masterStep;
    if (this.#master >= 1) {
      this.#master -= 1;
      this.#resetSlave(masterStep, slaveStep, square);
    } else {
      this.#runSlave(slaveStep, square);
    }
    this.#current += wave(this.#slave);
  }

  // the master turned: the slave is put back to 0, the jumps it made on its way there and the reset smoothed
  #resetSlave(masterStep: number, slaveStep: number, square: boolean): void {
    const wave = square ? squareAt : sawAt;
    const after = masterStep > 0 ? this.#master / masterStep : 0; // samples since the master turned
    let before = this.#slave + slaveStep * (1 - after); // where the slave got to as it's reset
    if (square && this.#slave < HALF && before >= HALF) {
      this.#jump(Math.min(1, after + (before - HALF) / slaveStep), -2);
    }
    if (before > 1) {
      this.#jump(Math.min(1, after + (before - 1) / slaveStep), turnHeight(square)); // its own turn, just before
      before -= 1;
    }
    this.#slave = slaveStep * after;
    this.#jump(after, wave(0) - wave(before));
  }

  // no reset: the slave moved on, its turn and a square's flip smoothed
  #runSlave(slaveStep: number, square: boolean): void {
    const was = this.#slave;
    this.#slave += slaveStep;
    if (this.#slave >= 1) {
      this.#slave -= 1;
      this.#jump(slaveStep > 0 ? this.#slave / slaveStep : 0, turnHeight(square));
      return;
    }
    if (square && was < HALF && this.#slave >= HALF) {
      this.#jump((this.#slave - HALF) / slaveStep, -2);
    }
  }

  // A jump of a height, so many samples before this one: the polyBLEP's two corrections, one on the sample before it,
  // one on this. A band-limited step minus a naive one, as a polynomial over a sample each side.
  #jump(after: number, height: number): void {
    this.#held += (height * after * after) / 2;
    this.#current -= (height * (1 - after) * (1 - after)) / 2;
  }
}

// how far the slave's wave jumps as its phase turns over: a square back up, a saw back down
function turnHeight(square: boolean): number {
  return square ? 2 : -2;
}
function sawAt(phase: number): number {
  return 2 * phase - 1;
}
function squareAt(phase: number): number {
  return phase < HALF ? 1 : -1;
}

// ---------- libs/dsp/grains/grain-cloud: granular freeze and smear, on sample arrays ----------

/** What a cloud is made with. */
export interface GrainCloudSetup {
  sampleRate: number;
  /** Seconds of input kept; 2 unless given. */
  memory?: number;
  /** A random 0 to 1 a grain's stray is drawn from; `Math.random` unless given. */
  random?: () => number;
}

/** What a block is rendered at; every one read once a block, not a sample. */
export interface GrainParams {
  /** 0.5 or more: the cloud stops listening, its grains playing what it held. */
  freeze: number;
  /** Seconds back from now a grain starts. */
  position: number;
  /** A grain's length in seconds. */
  size: number;
  /** Grains a second. */
  density: number;
  /** A grain's playback in semitones. */
  pitch: number;
  /** Seconds a grain's start strays from its position, at most. */
  spray: number;
}

interface Grain {
  from: number; // where in its ring it starts
  rate: number; // samples of the ring it reads for each it plays
  length: number; // samples it plays for
  age: number; // samples played so far
}

const MOST = 32; // grains sounding at once, at most: past it, a grain due isn't spawned
const MEMORY = 2; // s of its input it keeps unless told another

/**
 * Its input kept in a ring, `memory` seconds a channel, unless frozen; grains spawned at its density,
 * each reading from a position back from now, strayed by its spray, at its pitch, under a Hann window.
 * Every channel's grains come from the same place, so the stereo image holds.
 * Their sum is scaled by how many overlap, never much past unity.
 */
export class GrainCloud {
  /** Grains spawned so far. */
  spawned = 0;
  readonly #sampleRate: number;
  readonly #length: number; // samples a ring holds
  readonly #random: () => number;
  readonly #rings: Float32Array[] = []; // a channel's ring each, made as its channel first comes
  readonly #grains: Grain[] = [];
  #write = 0; // where the next sample goes
  #filled = 0; // samples held so far
  #due = 1; // grains owed: the first at once

  constructor({ sampleRate, memory = MEMORY, random = Math.random }: GrainCloudSetup) {
    this.#sampleRate = sampleRate;
    this.#length = Math.ceil(memory * sampleRate);
    this.#random = random;
  }

  /** A block rendered: its input kept unless frozen, its grains summed into `outputs`. */
  render(
    inputs: readonly ArrayLike<number>[],
    outputs: readonly Float32Array[],
    frames: number,
    { freeze, position, size, density, pitch, spray }: GrainParams,
  ): void {
    const rate = 2 ** (pitch / 12);
    const length = Math.max(2, Math.round(size * this.#sampleRate));
    const overlap = density * size;
    const scale = 1 / Math.sqrt(Math.max(1, overlap / 2)); // a Hann's overlaps: unity coherent, under it strayed
    for (const output of outputs) {
      output.fill(0);
    }
    for (let i = 0; i < frames; i++) {
      if (!(freeze >= 0.5)) {
        this.#keep(inputs, i);
      }
      this.#due += density / this.#sampleRate;
      if (this.#due >= 1) {
        this.#due -= 1;
        this.#spawn({ rate, length, position, spray });
      }
      this.#sound(outputs, i, scale);
    }
  }

  // a sample of each channel into its ring
  #keep(inputs: readonly ArrayLike<number>[], i: number): void {
    inputs.forEach((input, channel) => {
      const ring = (this.#rings[channel] ??= new Float32Array(this.#length));
      ring[this.#write] = input[i] ?? 0;
    });
    this.#write = (this.#write + 1) % this.#length;
    this.#filled = Math.min(this.#length, this.#filled + 1);
  }
  // A grain, where there's room and enough held: its start back from now by its position and a stray,
  // far enough back that a grain read faster never overtakes what's being kept.
  #spawn({
    rate,
    length,
    position,
    spray,
  }: Pick<GrainParams, 'position' | 'spray'> & { rate: number; length: number }): void {
    if (this.#grains.length >= MOST) {
      return;
    }
    const reach = length * rate; // samples a grain reads through
    const ahead = Math.max(0, reach - length); // how far it gains on now as it plays
    const back = (position + this.#random() * spray) * this.#sampleRate + ahead;
    const most = this.#filled - reach - 1;
    if (most <= 0) {
      return;
    }
    const from = this.#write - Math.min(back, most);
    this.#grains.push({ from: ((from % this.#length) + this.#length) % this.#length, rate, length, age: 0 });
    this.spawned++;
  }
  // each grain's sample, windowed, into every channel; a grain done let go
  #sound(outputs: readonly Float32Array[], i: number, scale: number): void {
    for (let g = this.#grains.length - 1; g >= 0; g--) {
      const grain = this.#grains[g]!; // g is inside the list
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * grain.age) / grain.length);
      const read = grain.from + grain.age * grain.rate;
      const at = Math.floor(read);
      const between = read - at;
      const here = at % this.#length;
      const next = (at + 1) % this.#length;
      outputs.forEach((output, channel) => {
        const ring = this.#rings[channel] ?? this.#rings[0];
        if (!ring) {
          return;
        }
        const sample = ring[here]! + (ring[next]! - ring[here]!) * between; // both inside the ring
        output[i] = (output[i] ?? 0) + sample * window * scale;
      });
      grain.age++;
      if (grain.age >= grain.length) {
        this.#grains.splice(g, 1);
      }
    }
  }
}

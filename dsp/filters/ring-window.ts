// ---------- dsp/filters/ring-window: the last values pushed, read as a window without moving them ----------

/** The last `length` values pushed, oldest first, read without moving them: each one written twice, a length apart. */
export class RingWindow {
  readonly #values: Float64Array;
  readonly #length: number;
  #next = 0;

  constructor(length: number) {
    this.#length = length;
    this.#values = new Float64Array(2 * length);
  }

  push(value: number): void {
    this.#values[this.#next] = value;
    this.#values[this.#next + this.#length] = value;
    this.#next = (this.#next + 1) % this.#length;
  }

  /** The window, oldest first, times a kernel as long. */
  dot(kernel: Float64Array): number {
    let sum = 0;
    const start = this.#next;
    for (let i = 0; i < this.#length; i++) {
      sum += this.#values[start + i]! * kernel[i]!;
    }
    return sum;
  }
}

// ---------- dsp/modal/mode-bank: an object that rings in its modes, pushed and read at points ----------
// Each mode a damped resonator, stepped by a central difference whose damping and stiffness are set so its poles
// are the exact ones (Bilbao, Numerical Sound Synthesis): any frequency below Nyquist rings true, never unstable.
// Its response to a force is linear and known before it moves, so a contact can solve its force implicitly.

/** A mode's motion: its displacement now and a sample before, all the scheme remembers. */
export interface ModeState {
  readonly now: number;
  readonly before: number;
}

/** A mode: what it rings at, how long to fall 60 dB, and how far it moves at each of the bank's points. */
export interface Mode {
  readonly frequency: number;
  readonly decayTime: number;
  readonly shape: readonly number[];
}

// 60 dB as a natural log of amplitude: ln(1000)
const LN_THOUSAND = 3 * Math.log(10);

/** Modes stepped a sample at a time, each force acting at a point, each position read at one. */
export class ModeBank {
  /** The modes it rings in: those under half the sample rate, the rest left out, as they would alias. */
  readonly modes: readonly Mode[];
  readonly #step: number; // s
  readonly #points: number;
  // per mode: q[n+1] = feedback·q[n] + feedforward·q[n-1] + gain·force
  readonly #feedback: Float64Array;
  readonly #feedforward: Float64Array;
  readonly #gain: Float64Array;
  // per mode, its stiffness ω̃² in the scheme: what its energy is measured by
  readonly #stiffness: Float64Array;
  // the shape at each point, a row a point, a column a mode
  readonly #shapes: Float64Array;
  #now: Float64Array;
  #before: Float64Array;
  readonly #pushed: Float64Array;
  // each mode at the next sample under the pushed forces alone: asked for at every contact, worked out once
  readonly #free: Float64Array;
  #freeKnown = false;

  constructor(modes: readonly Mode[], sampleRate: number) {
    this.modes = modes.filter(({ frequency }) => frequency < sampleRate / 2);
    this.#step = 1 / sampleRate;
    this.#points = Math.max(0, ...modes.map(({ shape }) => shape.length));
    const count = this.modes.length;
    this.#feedback = new Float64Array(count);
    this.#feedforward = new Float64Array(count);
    this.#gain = new Float64Array(count);
    this.#stiffness = new Float64Array(count);
    this.#shapes = new Float64Array(this.#points * count);
    this.modes.forEach((mode, index) => this.#setMode(mode, index));
    this.#now = new Float64Array(count);
    this.#before = new Float64Array(count);
    this.#pushed = new Float64Array(this.#points);
    this.#free = new Float64Array(count);
  }

  /** A force at a point, held for the next sample: a strike, or a thumb that isn't solved as a contact. */
  push(point: number, force: number): void {
    this.#pushed[point]! += force;
    this.#freeKnown = false;
  }

  /** A mode's motion: handed to another model of the same object, as a linear one takes over a ringing tail. */
  state(mode: number): ModeState {
    return { now: this.#now[mode]!, before: this.#before[mode]! };
  }

  /** A mode's motion set, as handed back: the bank goes on from it. */
  setState(mode: number, { now, before }: ModeState): void {
    this.#now[mode] = now;
    this.#before[mode] = before;
    this.#freeKnown = false;
  }

  /** Where a point is now. */
  position(point: number): number {
    let sum = 0;
    for (let mode = 0; mode < this.modes.length; mode++) {
      sum += this.#shapeAt(point, mode) * this.#now[mode]!;
    }
    return sum;
  }

  /** Where a point will be at the next sample, with only the forces pushed so far. */
  freePosition(point: number): number {
    const free = this.#freeModes();
    let sum = 0;
    for (let mode = 0; mode < this.modes.length; mode++) {
      sum += this.#shapeAt(point, mode) * free[mode]!;
    }
    return sum;
  }

  /** How far the point `to` moves at the next sample per unit of force at the point `from`; the same either way. */
  compliance(from: number, to: number): number {
    let sum = 0;
    for (let mode = 0; mode < this.modes.length; mode++) {
      sum += this.#gain[mode]! * this.#shapeAt(from, mode) * this.#shapeAt(to, mode);
    }
    return sum;
  }

  /** The next sample, with the pushed forces and these, one a point; the pushed ones then let go. */
  advance(forces?: ArrayLike<number>): void {
    const free = this.#freeModes();
    for (let mode = 0; mode < this.modes.length; mode++) {
      this.#before[mode] = free[mode]! + this.#gain[mode]! * this.#forceOn(mode, forces);
    }
    // the array just written becomes now, the old now becomes before
    const before = this.#now;
    this.#now = this.#before;
    this.#before = before;
    this.#pushed.fill(0);
    this.#freeKnown = false;
  }

  /** The energy in its modes, as the scheme keeps it: never negative, kept without damping, falling with it. */
  energy(): number {
    let sum = 0;
    for (let mode = 0; mode < this.modes.length; mode++) {
      const now = this.#now[mode]!;
      const before = this.#before[mode]!;
      const velocity = (now - before) / this.#step;
      sum += 0.5 * velocity * velocity + 0.5 * this.#stiffness[mode]! * now * before;
    }
    return sum;
  }

  #setMode({ frequency, decayTime, shape }: Mode, index: number): void {
    const step = this.#step;
    // per sample, the amplitude falls by r, so 60 dB in the decay time
    const fall = Math.exp((-LN_THOUSAND / decayTime) * step);
    const squared = fall * fall;
    const feedback = 2 * fall * Math.cos(2 * Math.PI * frequency * step);
    this.#feedback[index] = feedback;
    this.#feedforward[index] = -squared;
    // the scheme's 1 + σ̃T is 2 / (1 + r²): its force enters by T² over that
    this.#gain[index] = (step * step * (1 + squared)) / 2;
    this.#stiffness[index] = (2 - (2 * feedback) / (1 + squared)) / (step * step);
    shape.forEach((value, point) => {
      this.#shapes[point * this.modes.length + index] = value;
    });
  }

  #shapeAt(point: number, mode: number): number {
    return this.#shapes[point * this.modes.length + mode]!;
  }

  #freeModes(): Float64Array {
    if (!this.#freeKnown) {
      for (let mode = 0; mode < this.modes.length; mode++) {
        this.#free[mode] = this.#next(mode, this.#forceOn(mode, this.#pushed));
      }
      this.#freeKnown = true;
    }
    return this.#free;
  }

  // the mode at the next sample under this force
  #next(mode: number, force: number): number {
    return (
      this.#feedback[mode]! * this.#now[mode]!
      + this.#feedforward[mode]! * this.#before[mode]!
      + this.#gain[mode]! * force
    );
  }

  // the force on a mode: each point's force by the mode's shape there
  #forceOn(mode: number, forces: ArrayLike<number> | undefined): number {
    if (!forces) {
      return 0;
    }
    let sum = 0;
    for (let point = 0; point < this.#points; point++) {
      sum += this.#shapeAt(point, mode) * (forces[point] ?? 0);
    }
    return sum;
  }
}

// ---------- dsp/modal/contact-law: how hard two objects push apart, by how far one presses into the other ----------
// Hunt and Crossley's law: a force growing as a power of the penetration, and damping growing with it.
// A preload is a force the parts press together with at rest (a negative gap, in the collision papers' terms):
// measured from rest, the law then gives no force there, and gives the preload's pull once the contact opens.
// The mean force over a step, from the potential, is what keeps a scheme's energy (Chatziioannou and van Walstijn).
// Taken plainly, the potential's change over a short step is lost to rounding, the more so the larger the
// preload, and its slope twice over: so while pressed, it is written as a power of the step's ratio, (1 + r)^p.

/** A contact's values: stiffness k, exponent α (1 or more), damping λ, preload F0, all 0 or more. */
export interface ContactLawValues {
  readonly stiffness: number;
  readonly exponent: number;
  readonly damping?: number;
  readonly preload?: number;
}

/** The mean force over a step and its slope by where the step ends, written by `meanForceInto()`. */
export interface MeanForce {
  force: number;
  slope: number;
}

// a step's ratio under which the mean force is taken by its series: its error then under 10⁻⁹
const SERIES_BELOW = 1e-3;

/** The law, y the penetration measured from rest: k·[y0 + y]₊^α − F0, y0 where the preload is held. */
export class ContactLaw {
  /** How far the parts press into each other at rest, under the preload. */
  readonly restPenetration: number;
  readonly #stiffness: number;
  readonly #exponent: number;
  readonly #damping: number;
  readonly #preload: number;
  // the potential at rest, taken off so it reads 0 there
  readonly #restPotential: number;

  constructor({ stiffness, exponent, damping = 0, preload = 0 }: ContactLawValues) {
    this.#stiffness = stiffness;
    this.#exponent = exponent;
    this.#damping = damping;
    this.#preload = preload;
    this.restPenetration = (preload / stiffness) ** (1 / exponent);
    this.#restPotential = this.#pressed(0, exponent + 1) / (exponent + 1);
  }

  /** The force pushing the parts apart; negative once open, as the preload pulls them back. */
  force(penetration: number): number {
    return this.#pressed(penetration, this.#exponent) - this.#preload;
  }

  /** The energy stored in the contact, 0 at rest; its slope is the force. */
  potential(penetration: number): number {
    const stored = this.#pressed(penetration, this.#exponent + 1) / (this.#exponent + 1);
    return stored - this.#preload * penetration - this.#restPotential;
  }

  /** The mean force over a step from one penetration to another: the potential's change over the step. */
  averageForce(from: number, to: number): number {
    return this.meanForceInto(from, to, { force: 0, slope: 0 }).force;
  }

  /** How the mean force changes with where the step ends: what a Newton solve steps along. */
  averageForceSlope(from: number, to: number): number {
    return this.meanForceInto(from, to, { force: 0, slope: 0 }).slope;
  }

  /** The mean force over a step and its slope, written into `into` and handed back: a solve calls it many times. */
  meanForceInto(from: number, to: number, into: MeanForce): MeanForce {
    const start = this.restPenetration + from;
    const end = this.restPenetration + to;
    if (start > 0 && end > 0) {
      this.#meanWhilePressed(start, end, into);
    } else if (start <= 0 && end <= 0) {
      into.force = 0;
      into.slope = 0;
    } else {
      this.#meanAcrossEdge(start, end, into);
    }
    // the preload's share is linear: its mean over any step is itself, its slope none
    into.force -= this.#preload;
    return into;
  }

  /** Whether the parts are apart at a penetration, the preload's pull all that acts. */
  isOpen(penetration: number): boolean {
    return this.restPenetration + penetration <= 0;
  }

  /** The damping at a penetration: force per unit of speed, growing as the contact is pressed. */
  dampingAt(penetration: number): number {
    return (this.#damping * this.#pressed(penetration, this.#exponent)) / this.#stiffness;
  }

  // k·[y0 + y]₊ to a power: the compression's share of the law
  #pressed(penetration: number, power: number): number {
    const compression = this.restPenetration + penetration;
    if (compression <= 0) {
      return 0;
    }
    return this.#stiffness * compression ** power;
  }

  // Pressed at both ends: (k/p)·(end^p − start^p)/(end − start) = (k/p)·start^(p−1)·E(r), r = end/start − 1,
  // E(r) = ((1 + r)^p − 1)/r, by expm1 and log1p, or by its series where r is tiny; the slope from E'(r).
  #meanWhilePressed(start: number, end: number, into: MeanForce): void {
    const power = this.#exponent + 1;
    const ratio = (end - start) / start;
    const pressed = this.#stiffness * start ** this.#exponent;
    let mean: number;
    let meanSlope: number;
    if (Math.abs(ratio) < SERIES_BELOW) {
      // (1 + r)^p's binomial terms past p·r: E = p + c2·r + c3·r² + c4·r³, E' = c2 + 2·c3·r + 3·c4·r²
      const second = (power * (power - 1)) / 2;
      const third = (second * (power - 2)) / 3;
      const fourth = (third * (power - 3)) / 4;
      mean = power + ratio * (second + ratio * (third + ratio * fourth));
      meanSlope = second + ratio * (2 * third + ratio * 3 * fourth);
    } else {
      const logGrowth = Math.log1p(ratio);
      const grown = Math.expm1(power * logGrowth);
      mean = grown / ratio;
      meanSlope = (power * Math.exp((power - 1) * logGrowth) * ratio - grown) / (ratio * ratio);
    }
    into.force = (pressed * mean) / power;
    into.slope = (pressed * meanSlope) / (power * start);
  }

  // Pressed at one end only: the stored energy there over the step, nothing at the other; no cancellation.
  #meanAcrossEdge(start: number, end: number, into: MeanForce): void {
    const power = this.#exponent + 1;
    const stored = (compression: number): number =>
      compression > 0 ? (this.#stiffness * compression ** power) / power : 0;
    const step = end - start;
    into.force = (stored(end) - stored(start)) / step;
    const atEnd = end > 0 ? this.#stiffness * end ** this.#exponent : 0;
    into.slope = (atEnd - into.force) / step;
  }
}

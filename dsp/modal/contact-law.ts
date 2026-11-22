// ---------- dsp/modal/contact-law: how hard two objects push apart, by how far one presses into the other ----------
// Hunt and Crossley's law: a force growing as a power of the penetration, and damping growing with it.
// A preload is a force the parts press together with at rest (a negative gap, in the collision papers' terms):
// measured from rest, the law then gives no force there, and gives the preload's pull once the contact opens.
// The mean force over a step, from the potential, is what keeps a scheme's energy (Chatziioannou and van Walstijn).

/** A contact's values: stiffness k, exponent α (1 or more), damping λ, preload F0, all 0 or more. */
export interface ContactLawValues {
  readonly stiffness: number;
  readonly exponent: number;
  readonly damping?: number;
  readonly preload?: number;
}

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
    if (this.#tooClose(from, to)) {
      return this.force((from + to) / 2);
    }
    return (this.potential(to) - this.potential(from)) / (to - from);
  }

  /** How the mean force changes with where the step ends: what a Newton solve steps along. */
  averageForceSlope(from: number, to: number): number {
    if (this.#tooClose(from, to)) {
      return this.#stiffnessAt((from + to) / 2) / 2;
    }
    return (this.force(to) - this.averageForce(from, to)) / (to - from);
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

  #stiffnessAt(penetration: number): number {
    return this.#exponent * this.#pressed(penetration, this.#exponent - 1);
  }

  // a step so short that the potential's change over it is lost to rounding
  #tooClose(from: number, to: number): boolean {
    return Math.abs(to - from) <= 1e-9 * (Math.abs(from) + Math.abs(to) + this.restPenetration);
  }
}

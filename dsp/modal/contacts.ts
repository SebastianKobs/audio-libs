// ---------- dsp/modal/contacts: contacts between mode banks, every force solved at once each sample ----------
// A bank's next position is linear in the forces on it, and known before it moves (ModeBank's compliance).
// So each penetration at the next sample is its free value less a matrix times the forces, and the forces depend on
// the penetrations: Newton solves that, a row a contact, so two contacts on one object see each other at once.
// The force over a step is the potential's mean slope (ContactLaw): with no damping the total energy is kept.
// A contact open over the whole step pushes with a constant force (none, or its preload's pull): it stays out of
// the solve, unless the solve shows it closing, and a sample with every contact open costs no Newton step.
import type { ContactLaw, MeanForce } from './contact-law.ts';
import type { ModeBank } from './mode-bank.ts';

/** A point of a mode bank. */
export interface ContactPoint {
  readonly bank: ModeBank;
  readonly point: number;
}

/**
 * A contact: a law, the point that presses, and what it presses into: another bank's point, or none, a barrier the
 * caller moves, at `barrier` to start. `facing` 1 when `on` presses by moving up, -1 by moving down.
 */
export interface Contact {
  readonly law: ContactLaw;
  readonly on: ContactPoint;
  readonly against?: ContactPoint;
  readonly barrier?: number;
  readonly facing?: 1 | -1;
}

// a solve stops once its steps are this small against the penetrations: rounding, not physics;
// at 1e-12 a contact barely moving bounced on rounding's floor, 1e-16 against a rest penetration of 7e-6
const TOLERANCE = 1e-9;
// more steps than this, and the sample counts as stalled
const MOST_STEPS = 50;

/** Contacts and the banks they touch, advanced a sample at a time; advance those banks only here. */
export class Contacts {
  /** The samples whose solve ran out of steps, its last guess used. */
  stalls = 0;
  readonly #contacts: readonly Contact[];
  readonly #step: number; // s
  readonly #banks: readonly ModeBank[];
  // per bank, the forces at its points, written each sample
  readonly #forcesOf: Map<ModeBank, Float64Array>;
  // how far each penetration moves at the next sample per unit of each force, a row a contact
  readonly #coupling: Float64Array;
  readonly #barriers: Float64Array;
  readonly #nextBarriers: Float64Array;
  // each penetration a sample back: while solving, the step's start; between samples, where the last one ended
  readonly #before: Float64Array;
  readonly #now: Float64Array;
  readonly #forces: Float64Array;
  // the solve's working rows, kept so a sample allocates nothing
  readonly #free: Float64Array;
  readonly #guess: Float64Array;
  readonly #damping: Float64Array;
  readonly #startPotential: Float64Array;
  readonly #slopes: Float64Array;
  // the contacts in the solve, by index, and whether each is: one open over the whole step keeps its force
  readonly #solved: Int32Array;
  readonly #inSolve: Uint8Array;
  readonly #mean: MeanForce = { force: 0, slope: 0 };
  readonly #residual: Float64Array;
  readonly #jacobian: Float64Array;

  constructor(contacts: readonly Contact[], sampleRate: number) {
    const count = contacts.length;
    this.#contacts = contacts;
    this.#step = 1 / sampleRate;
    const points = contacts.flatMap(({ on, against }) => (against ? [on, against] : [on]));
    this.#banks = [...new Set(points.map(({ bank }) => bank))];
    this.#forcesOf = new Map(
      this.#banks.map((bank) => {
        const most = Math.max(...points.filter((each) => each.bank === bank).map(({ point }) => point));
        return [bank, new Float64Array(most + 1)];
      }),
    );
    this.#coupling = couplingOf(contacts);
    this.#barriers = Float64Array.from(contacts, ({ barrier = 0 }) => barrier);
    this.#nextBarriers = Float64Array.from(this.#barriers);
    this.#before = Float64Array.from(contacts, (_, index) => this.penetration(index));
    this.#now = new Float64Array(count);
    this.#forces = new Float64Array(count);
    this.#free = new Float64Array(count);
    this.#guess = new Float64Array(count);
    this.#damping = new Float64Array(count);
    this.#startPotential = new Float64Array(count);
    this.#slopes = new Float64Array(count);
    this.#solved = new Int32Array(count);
    this.#inSolve = new Uint8Array(count);
    this.#residual = new Float64Array(count);
    this.#jacobian = new Float64Array(count * count);
  }

  /** Where a contact's barrier is from the next sample on: a thumb pressing down, or lifted away. */
  moveBarrier(contact: number, position: number): void {
    this.#nextBarriers[contact] = position;
  }

  /** The force a contact pushed apart with over the last sample; negative while a preload pulls it shut. */
  force(contact: number): number {
    return this.#forces[contact]!;
  }

  /** How far a contact's point presses into what it touches now, measured from rest. */
  penetration(contact: number): number {
    const { on, against, facing = 1 } = this.#contacts[contact]!;
    const other = against ? against.bank.position(against.point) : this.#barriers[contact]!;
    return facing * (on.bank.position(on.point) - other);
  }

  /** The next sample: every contact's force solved, then every bank it touches advanced with them. */
  advance(): void {
    const count = this.#contacts.length;
    for (let index = 0; index < count; index++) {
      const { law } = this.#contacts[index]!;
      const now = this.penetration(index);
      const before = this.#before[index]!;
      this.#now[index] = now;
      this.#free[index] = this.#freePenetration(index);
      this.#guess[index] = this.#free[index]!;
      this.#damping[index] = law.dampingAt(now) / (2 * this.#step);
      this.#startPotential[index] = law.potential(before);
      // open a sample back and now: its force stays what the open law gives, unless the solve shows it closing
      this.#inSolve[index] = law.isOpen(before) && law.isOpen(now) ? 0 : 1;
      if (!this.#inSolve[index]) {
        this.#forces[index] = law.force(now);
      }
    }
    this.#solveUntilSettled();
    this.#before.set(this.#now);
    this.#advanceBanks();
    this.#barriers.set(this.#nextBarriers);
  }

  /** The energy in the banks and the contacts, kept without damping, falling with it. */
  energy(): number {
    let sum = 0;
    for (const bank of this.#banks) {
      sum += bank.energy();
    }
    this.#contacts.forEach(({ law }, index) => {
      sum += (law.potential(this.penetration(index)) + law.potential(this.#before[index]!)) / 2;
    });
    return sum;
  }

  #freePenetration(index: number): number {
    const { on, against, facing = 1 } = this.#contacts[index]!;
    const other = against ? against.bank.freePosition(against.point) : this.#nextBarriers[index]!;
    return facing * (on.bank.freePosition(on.point) - other);
  }

  // Newton on the contacts in the solve; then each one left out checked, joining it if it would close, and again
  #solveUntilSettled(): void {
    const count = this.#contacts.length;
    for (let pass = 0; pass <= count; pass++) {
      this.#solve();
      let joined = false;
      for (let index = 0; index < count; index++) {
        if (!this.#inSolve[index] && !this.#contacts[index]!.law.isOpen(this.#ending(index))) {
          this.#inSolve[index] = 1;
          joined = true;
        }
      }
      if (!joined) {
        return;
      }
    }
  }

  // Newton on the penetrations in the solve: y = free − coupling · force(y), the others' forces fixed
  #solve(): void {
    const size = this.#gatherSolved();
    if (size === 0) {
      return;
    }
    for (let step = 0; step < MOST_STEPS; step++) {
      this.#setForces(size);
      if (this.#newtonStep(size)) {
        this.#setForces(size);
        return;
      }
    }
    this.stalls++;
  }

  // the contacts in the solve, their indexes first in `#solved`; how many
  #gatherSolved(): number {
    let size = 0;
    for (let index = 0; index < this.#contacts.length; index++) {
      if (this.#inSolve[index]) {
        this.#solved[size++] = index;
      }
    }
    return size;
  }

  #setForces(size: number): void {
    for (let place = 0; place < size; place++) {
      this.#setForceAt(this.#solved[place]!);
    }
  }

  // one step along the slopes, the forces set at the guess; whether the step was small enough to stop
  #newtonStep(size: number): boolean {
    const count = this.#contacts.length;
    for (let row = 0; row < size; row++) {
      const index = this.#solved[row]!;
      this.#residual[row] = this.#guess[index]! - this.#ending(index);
      for (let column = 0; column < size; column++) {
        const other = this.#solved[column]!;
        const diagonal = row === column ? 1 : 0;
        this.#jacobian[row * size + column] = this.#coupling[index * count + other]! * this.#slopes[other]! + diagonal;
      }
    }
    solveInPlace(this.#jacobian, this.#residual, size);
    let largest = 0;
    let scale = 0;
    for (let row = 0; row < size; row++) {
      const index = this.#solved[row]!;
      this.#guess[index]! -= this.#residual[row]!;
      largest = Math.max(largest, Math.abs(this.#residual[row]!));
      scale = Math.max(scale, Math.abs(this.#guess[index]!), this.#contacts[index]!.law.restPenetration);
    }
    return largest <= TOLERANCE * scale;
  }

  // where a contact's penetration ends at the next sample under every force as it stands: free less their push
  #ending(index: number): number {
    const count = this.#contacts.length;
    let pushed = 0;
    for (let other = 0; other < count; other++) {
      pushed += this.#coupling[index * count + other]! * this.#forces[other]!;
    }
    return this.#free[index]! - pushed;
  }

  // a contact's force over this sample and its slope, its penetration ending at its guess: the mean force, and
  // damping by its speed
  #setForceAt(index: number): void {
    const before = this.#before[index]!;
    const guess = this.#guess[index]!;
    const { force, slope } = this.#contacts[index]!.law.meanForceInto(
      before,
      this.#startPotential[index]!,
      guess,
      this.#mean,
    );
    this.#forces[index] = force + this.#damping[index]! * (guess - before);
    this.#slopes[index] = slope + this.#damping[index]!;
  }

  // each force on its two points, apart: on `on` against its facing, on `against` along it
  #advanceBanks(): void {
    for (const forces of this.#forcesOf.values()) {
      forces.fill(0);
    }
    this.#contacts.forEach(({ on, against, facing = 1 }, index) => {
      const force = this.#forces[index]!;
      this.#forcesOf.get(on.bank)![on.point]! -= facing * force;
      if (against) {
        this.#forcesOf.get(against.bank)![against.point]! += facing * force;
      }
    });
    for (const bank of this.#banks) {
      bank.advance(this.#forcesOf.get(bank));
    }
  }
}

// How far each contact's penetration moves per unit of each contact's force at the next sample, a row a contact:
// a force pushes its own two points apart, and moves every other point of the same banks by their compliance.
function couplingOf(contacts: readonly Contact[]): Float64Array {
  const count = contacts.length;
  const coupling = new Float64Array(count * count);
  contacts.forEach((row, rowIndex) => {
    contacts.forEach((column, columnIndex) => {
      const reach = (to: ContactPoint | undefined, from: ContactPoint | undefined): number => {
        if (!to || !from || to.bank !== from.bank) {
          return 0;
        }
        return to.bank.compliance(from.point, to.point);
      };
      const sum =
        reach(row.on, column.on)
        - reach(row.on, column.against)
        - reach(row.against, column.on)
        + reach(row.against, column.against);
      coupling[rowIndex * count + columnIndex] = (row.facing ?? 1) * (column.facing ?? 1) * sum;
    });
  });
  return coupling;
}

// Solves matrix · x = vector, x written over the vector: Gaussian elimination, the largest pivot first.
// The matrix is a few contacts wide, so a dense solve each step costs little; it is overwritten.
function solveInPlace(matrix: Float64Array, vector: Float64Array, size: number): void {
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(matrix[row * size + column]!) > Math.abs(matrix[pivot * size + column]!)) {
        pivot = row;
      }
    }
    if (pivot !== column) {
      for (let across = 0; across < size; across++) {
        const held = matrix[column * size + across]!;
        matrix[column * size + across] = matrix[pivot * size + across]!;
        matrix[pivot * size + across] = held;
      }
      const held = vector[column]!;
      vector[column] = vector[pivot]!;
      vector[pivot] = held;
    }
    for (let row = column + 1; row < size; row++) {
      const factor = matrix[row * size + column]! / matrix[column * size + column]!;
      for (let across = column; across < size; across++) {
        matrix[row * size + across]! -= factor * matrix[column * size + across]!;
      }
      vector[row]! -= factor * vector[column]!;
    }
  }
  for (let row = size - 1; row >= 0; row--) {
    let sum = vector[row]!;
    for (let across = row + 1; across < size; across++) {
      sum -= matrix[row * size + across]! * vector[across]!;
    }
    vector[row] = sum / matrix[row * size + row]!;
  }
}

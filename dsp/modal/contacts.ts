// ---------- dsp/modal/contacts: contacts between mode banks, every force solved at once each sample ----------
// A bank's next position is linear in the forces on it, and known before it moves (ModeBank's compliance).
// So each penetration at the next sample is its free value less a matrix times the forces, and the forces depend on
// the penetrations: Newton solves that, a row a contact, so two contacts on one object see each other at once.
// The force over a step is the potential's mean slope (ContactLaw): with no damping the total energy is kept.
import type { ContactLaw } from './contact-law.ts';
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

// a solve stops once its steps are this small against the penetrations: rounding, not physics
const TOLERANCE = 1e-12;
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
      const now = this.penetration(index);
      this.#now[index] = now;
      this.#free[index] = this.#freePenetration(index);
      this.#guess[index] = this.#free[index]!;
      this.#damping[index] = this.#contacts[index]!.law.dampingAt(now) / (2 * this.#step);
    }
    this.#solve();
    for (let index = 0; index < count; index++) {
      this.#forces[index] = this.#forceAt(index, this.#guess[index]!);
    }
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

  // Newton on the penetrations: y = free − coupling · force(y)
  #solve(): void {
    const count = this.#contacts.length;
    for (let step = 0; step < MOST_STEPS; step++) {
      for (let row = 0; row < count; row++) {
        let pushed = 0;
        for (let column = 0; column < count; column++) {
          const coupling = this.#coupling[row * count + column]!;
          const guess = this.#guess[column]!;
          pushed += coupling * this.#forceAt(column, guess);
          this.#jacobian[row * count + column] = coupling * this.#slopeAt(column, guess) + (row === column ? 1 : 0);
        }
        this.#residual[row] = this.#guess[row]! - this.#free[row]! + pushed;
      }
      solveInPlace(this.#jacobian, this.#residual, count);
      let largest = 0;
      let scale = 0;
      for (let row = 0; row < count; row++) {
        this.#guess[row]! -= this.#residual[row]!;
        largest = Math.max(largest, Math.abs(this.#residual[row]!));
        scale = Math.max(scale, Math.abs(this.#guess[row]!), this.#contacts[row]!.law.restPenetration);
      }
      if (largest <= TOLERANCE * scale) {
        return;
      }
    }
    this.stalls++;
  }

  // a contact's force over this sample, if its penetration ends at y: the mean force, and damping by its speed
  #forceAt(index: number, penetration: number): number {
    const before = this.#before[index]!;
    const mean = this.#contacts[index]!.law.averageForce(before, penetration);
    return mean + this.#damping[index]! * (penetration - before);
  }

  #slopeAt(index: number, penetration: number): number {
    return this.#contacts[index]!.law.averageForceSlope(this.#before[index]!, penetration) + this.#damping[index]!;
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

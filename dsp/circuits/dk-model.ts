// ---------- dsp/circuits/dk-model: a circuit as a state-space model, by the nodal DK method ----------
// Nodal analysis, done once: Kirchhoff's current law at every node, each source's voltage pinned, solved for
// what the circuit's voltages are in terms of what it remembers, its inputs and its transistors' currents
// (Holters and Zölzer, DAFx-11; Holmes and van Walstijn, DAFx-16, equations 1 to 3):
//   v[n] = G·x[n-1] + H·u[n] + K·f   the transistors' junction voltages
//   y[n] = D·x[n-1] + E·u[n] + F·f   the output voltage
//   x[n] = A·x[n-1] + B·u[n] + C·f   what each capacitor carries to the next sample
// Each capacitor by the trapezoidal rule: a conductance 2C/T beside a current source of its history, so the
// model is stable at any rate and its frequency response the circuit's, warped as the bilinear transform warps.
// f, the transistors' currents at v, is the solver's: this model only holds the linear rest.
import { inverse, product, type Matrix } from './matrices.ts';
import { NodalSystem } from './nodal-system.ts';

/** A part's two ends, by node name; `ground` is the reference. */
export type Terminals = readonly [string, string];

/** A circuit of resistors, capacitors, voltage sources and PNP transistors, its output a voltage across two nodes. */
export interface Netlist {
  readonly resistors: readonly { readonly between: Terminals; readonly ohms: number }[];
  readonly capacitors: readonly { readonly between: Terminals; readonly farads: number }[];
  /** Voltage sources, each its + end then its - end: their voltages are the model's inputs, in this order. */
  readonly sources: readonly Terminals[];
  /** PNP transistors: each takes its emitter-base and emitter-collector voltages, gives its base and collector currents. */
  readonly transistors: readonly { readonly emitter: string; readonly base: string; readonly collector: string }[];
  readonly output: Terminals;
}

/** A netlist's state-space model at a sample rate, and what its capacitors remember. */
export class DkModel {
  /** K, row after row: how each transistor current moves each junction voltage, for the solver. */
  readonly feedback: Float64Array;
  readonly #matrices: Record<
    'fromStates' | 'fromInputs' | 'outFromStates' | 'outFromInputs' | 'outFromCurrents',
    Matrix
  >;
  readonly #next: Record<'fromStates' | 'fromInputs' | 'fromCurrents', Matrix>;
  readonly #capacitors: Record<'fromStates' | 'fromInputs' | 'fromCurrents', Matrix>;
  readonly #conductances: readonly number[];
  readonly #states: Float64Array;
  readonly #updated: Float64Array;
  readonly #known: Float64Array;

  constructor(netlist: Netlist, sampleRate: number) {
    const circuit = new NodalSystem(netlist, sampleRate);
    const solved = inverse(circuit.system);
    const through = (picks: Matrix, injections: Matrix) => product(product(picks, solved), injections);
    this.feedback = through(circuit.junctionPicks, circuit.currentInjections).values;
    this.#matrices = {
      fromStates: through(circuit.junctionPicks, circuit.historyInjections),
      fromInputs: through(circuit.junctionPicks, circuit.sourcePins),
      outFromStates: through(circuit.outputPick, circuit.historyInjections),
      outFromInputs: through(circuit.outputPick, circuit.sourcePins),
      outFromCurrents: through(circuit.outputPick, circuit.currentInjections),
    };
    this.#capacitors = {
      fromStates: through(circuit.capacitorPicks, circuit.historyInjections),
      fromInputs: through(circuit.capacitorPicks, circuit.sourcePins),
      fromCurrents: through(circuit.capacitorPicks, circuit.currentInjections),
    };
    this.#conductances = circuit.capacitorConductances;
    // x[n] = 2·(2C/T)·v_C[n] - x[n-1]: the trapezoidal rule's history, carried on
    const doubled = circuit.capacitorPicks; // its last use as picks: doubled in place
    circuit.capacitorConductances.forEach((conductance, k) => {
      for (let column = 0; column < doubled.columns; column++) {
        doubled.values[k * doubled.columns + column]! *= 2 * conductance;
      }
    });
    const fromStates = through(doubled, circuit.historyInjections);
    for (let k = 0; k < fromStates.rows; k++) {
      fromStates.values[k * fromStates.columns + k]! -= 1;
    }
    this.#next = {
      fromStates,
      fromInputs: through(doubled, circuit.sourcePins),
      fromCurrents: through(doubled, circuit.currentInjections),
    };
    this.#states = new Float64Array(netlist.capacitors.length);
    this.#updated = new Float64Array(netlist.capacitors.length);
    this.#known = new Float64Array(netlist.transistors.length * 2);
  }

  /** G·x + H·u: the junction voltages before the transistors' own currents feed back, for the solver to start from. */
  knownVoltages(inputs: ArrayLike<number>): Float64Array {
    const { fromStates, fromInputs } = this.#matrices;
    for (let row = 0; row < this.#known.length; row++) {
      this.#known[row] = rowTimes(fromStates, row, this.#states) + rowTimes(fromInputs, row, inputs);
    }
    return this.#known;
  }

  /** The output at the solved currents, and the capacitors moved on a sample. */
  advance(inputs: ArrayLike<number>, currents: ArrayLike<number>): number {
    const { outFromStates, outFromInputs, outFromCurrents } = this.#matrices;
    const output =
      rowTimes(outFromStates, 0, this.#states)
      + rowTimes(outFromInputs, 0, inputs)
      + rowTimes(outFromCurrents, 0, currents);
    const { fromStates, fromInputs, fromCurrents } = this.#next;
    for (let row = 0; row < this.#updated.length; row++) {
      this.#updated[row] =
        rowTimes(fromStates, row, this.#states)
        + rowTimes(fromInputs, row, inputs)
        + rowTimes(fromCurrents, row, currents);
    }
    this.#states.set(this.#updated);
    return output;
  }

  /**
   * Each capacitor's voltage at these inputs and currents, from what the capacitors hold. Made at a rate of 0, the
   * capacitors open, it is the circuit at DC: how a model at its real rate is started settled.
   */
  capacitorVoltages(inputs: ArrayLike<number>, currents: ArrayLike<number>): Float64Array {
    const { fromStates, fromInputs, fromCurrents } = this.#capacitors;
    return Float64Array.from(
      { length: this.#states.length },
      (_, row) =>
        rowTimes(fromStates, row, this.#states)
        + rowTimes(fromInputs, row, inputs)
        + rowTimes(fromCurrents, row, currents),
    );
  }

  /** The capacitors held at these voltages, no current through them: the circuit as it is after settling. */
  settle(capacitorVoltages: ArrayLike<number>): void {
    this.#conductances.forEach((conductance, k) => {
      this.#states[k] = conductance * capacitorVoltages[k]!; // x = (2C/T)·v + i, and i is 0
    });
  }
}

/** One row of a matrix times a vector. */
function rowTimes(matrix: Matrix, row: number, vector: ArrayLike<number>): number {
  let sum = 0;
  for (let column = 0; column < matrix.columns; column++) {
    sum += matrix.values[row * matrix.columns + column]! * vector[column]!;
  }
  return sum;
}

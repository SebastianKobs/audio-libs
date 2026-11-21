// ---------- dsp/circuits/nodal-system: a netlist's nodal equations, as matrices ----------
// Kirchhoff's current law at every node but ground, each voltage source's voltage pinned on a row of its own.
import type { Netlist, Terminals } from './dk-model.ts';
import { zeros, type Matrix } from './matrices.ts';

const GROUND = 'ground';
const NOT_A_NODE = -1; // ground's index: its voltage is 0, it has no row

/**
 * A netlist's nodal equations: the system matrix (the conductances, each source's pin) and how each kind of
 * thing enters it or is read from it. Its unknowns are the node voltages, then each source's current.
 */
export class NodalSystem {
  readonly system: Matrix;
  readonly historyInjections: Matrix; // each capacitor's history, a current into its + node, out of its - node
  readonly sourcePins: Matrix; // each source's voltage, on its own row
  readonly currentInjections: Matrix; // each transistor's base and collector currents, into those nodes, out of its emitter
  readonly junctionPicks: Matrix; // each transistor's emitter-base and emitter-collector voltages
  readonly capacitorPicks: Matrix; // each capacitor's voltage
  readonly outputPick: Matrix;
  readonly capacitorConductances: readonly number[];
  readonly #nodes: Map<string, number>;

  constructor(netlist: Netlist, sampleRate: number) {
    this.#nodes = namedNodes(netlist);
    const nodeCount = this.#nodes.size;
    const size = nodeCount + netlist.sources.length;
    const currents = netlist.transistors.length * 2;
    this.system = zeros(size, size);
    this.historyInjections = zeros(size, netlist.capacitors.length);
    this.sourcePins = zeros(size, netlist.sources.length);
    this.currentInjections = zeros(size, currents);
    this.junctionPicks = zeros(currents, size);
    this.capacitorPicks = zeros(netlist.capacitors.length, size);
    this.outputPick = zeros(1, size);
    this.capacitorConductances = netlist.capacitors.map(({ farads }) => 2 * farads * sampleRate);

    netlist.resistors.forEach(({ between, ohms }) => this.#conductance(between, 1 / ohms));
    netlist.capacitors.forEach(({ between }, k) => {
      this.#conductance(between, this.capacitorConductances[k]!);
      this.#across(this.historyInjections, between, k, 'column');
      this.#across(this.capacitorPicks, between, k, 'row');
    });
    netlist.sources.forEach((between, k) => {
      const row = nodeCount + k;
      this.#across(this.system, between, row, 'row');
      this.#across(this.system, between, row, 'column');
      this.sourcePins.values[row * netlist.sources.length + k] = 1;
    });
    netlist.transistors.forEach(({ emitter, base, collector }, t) => {
      this.#across(this.currentInjections, [base, emitter], 2 * t, 'column');
      this.#across(this.currentInjections, [collector, emitter], 2 * t + 1, 'column');
      this.#across(this.junctionPicks, [emitter, base], 2 * t, 'row');
      this.#across(this.junctionPicks, [emitter, collector], 2 * t + 1, 'row');
    });
    this.#across(this.outputPick, netlist.output, 0, 'row');
  }

  #conductance([one, other]: Terminals, siemens: number): void {
    const [a, b] = [this.#index(one), this.#index(other)];
    const size = this.system.columns;
    for (const [row, column, sign] of [
      [a, a, 1],
      [b, b, 1],
      [a, b, -1],
      [b, a, -1],
    ] as const) {
      if (row !== NOT_A_NODE && column !== NOT_A_NODE) {
        this.system.values[row * size + column]! += sign * siemens;
      }
    }
  }

  // +1 at a pair's first node and -1 at its second, along a row or down a column: a voltage across it read, or a
  // current into the first and out of the second
  #across(matrix: Matrix, [plus, minus]: Terminals, at: number, along: 'row' | 'column'): void {
    for (const [node, sign] of [
      [this.#index(plus), 1],
      [this.#index(minus), -1],
    ] as const) {
      if (node === NOT_A_NODE) {
        continue;
      }
      if (along === 'row') {
        matrix.values[at * matrix.columns + node]! += sign;
      } else {
        matrix.values[node * matrix.columns + at]! += sign;
      }
    }
  }

  #index(name: string): number {
    return this.#nodes.get(name) ?? NOT_A_NODE;
  }
}

/** Every node a netlist names but ground, numbered in the order they first appear. */
function namedNodes(netlist: Netlist): Map<string, number> {
  const names = [
    ...netlist.resistors.flatMap(({ between }) => between),
    ...netlist.capacitors.flatMap(({ between }) => between),
    ...netlist.sources.flat(),
    ...netlist.transistors.flatMap(({ emitter, base, collector }) => [emitter, base, collector]),
    ...netlist.output,
  ];
  const nodes = new Map<string, number>();
  for (const name of names) {
    if (name !== GROUND && !nodes.has(name)) {
      nodes.set(name, nodes.size);
    }
  }
  return nodes;
}

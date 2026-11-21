// ---------- dsp/circuits/parasitics: a transistor's base resistance and junction capacitances, added to a netlist ----------
// They are linear, so they go into the netlist as parts, not into the transistor's law: the DK model takes them into
// its matrices at no cost per sample. Holmes, Holters and van Walstijn (DAFx-17) name them the first extension to
// Ebers-Moll: they change the sound at least as much as its DC terms. The Miller effect comes with them: the
// collector-base capacitance, across the stage's gain, acts larger.
import type { Netlist } from './dk-model.ts';

/** A transistor's resistance in series with its base, in Ω, and its junctions' capacitances, constant, in F. */
export interface Parasitics {
  readonly baseResistance: number;
  readonly emitterBaseCapacitance: number;
  readonly collectorBaseCapacitance: number;
}

/** The netlist with each transistor's base moved behind its base resistance, its junctions' capacitances across it. */
export function withParasitics(netlist: Netlist, parasitics: Parasitics): Netlist {
  const inside = netlist.transistors.map(({ base }) => `${base} (inside)`);
  return {
    ...netlist,
    resistors: [
      ...netlist.resistors,
      ...netlist.transistors.map(({ base }, t) => ({
        between: [base, inside[t]!] as const,
        ohms: parasitics.baseResistance,
      })),
    ],
    capacitors: [
      ...netlist.capacitors,
      ...netlist.transistors.flatMap(({ emitter, collector }, t) => [
        { between: [emitter, inside[t]!] as const, farads: parasitics.emitterBaseCapacitance },
        { between: [collector, inside[t]!] as const, farads: parasitics.collectorBaseCapacitance },
      ]),
    ],
    transistors: netlist.transistors.map((transistor, t) => ({ ...transistor, base: inside[t]! })),
  };
}

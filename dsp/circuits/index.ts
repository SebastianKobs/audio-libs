// ---------- dsp/circuits: analog circuits modeled from their parts, sample by sample (its entry) ----------
// Its parts:
//   - ebers-moll-pnp.ts: a PNP transistor's currents and their slopes from its two junction voltages.
//   - transistors.ts: measured transistors' values.
//   - parasitics.ts: a transistor's base resistance and junction capacitances, added to a netlist as parts.
//   - dk-model.ts: a netlist as a state-space model by the nodal DK method, its capacitors by the trapezoidal rule.
//   - nodal-system.ts: a netlist's nodal equations as matrices, which the DK model is solved from.
//   - matrices.ts: the dense matrices that model is worked out with, once.
//   - rangemaster.ts: the Dallas Rangemaster's circuit as a netlist.
//   - pnp-stage.ts: a one-transistor circuit run sample by sample, its transistor solved by damped Newton.
export { DkModel, type Netlist, type Terminals } from './dk-model.ts';
export { EbersMollPnp, type EbersMollValues, type PnpCurrents } from './ebers-moll-pnp.ts';
export { RANGEMASTER } from './rangemaster.ts';
export { withParasitics, type Parasitics } from './parasitics.ts';
export { PnpStage } from './pnp-stage.ts';
export { OC44_EBERS_MOLL, OC44_PARASITICS } from './transistors.ts';

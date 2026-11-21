// ---------- dsp/circuits: analog circuits modeled from their parts, sample by sample (its entry) ----------
// Its parts:
//   - ebers-moll-pnp.ts: a PNP transistor's currents and their slopes from its two junction voltages.
//   - transistors.ts: measured transistors' values.
export { EbersMollPnp, type EbersMollValues, type PnpCurrents } from './ebers-moll-pnp.ts';
export { OC44_EBERS_MOLL } from './transistors.ts';

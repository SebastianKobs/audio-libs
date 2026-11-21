# dsp/circuits

Analog circuits modeled from their parts, for a drive that sounds like the circuit and not like a curve. A circuit is a netlist, made a state-space model once by the nodal DK method, so only its transistors' currents are solved at each sample. The transistor is a PNP as Ebers and Moll model it, two diodes whose currents grow exponentially with their voltages, most of one passing on to the collector. It gives a circuit solver the base and collector currents at the two junction voltages, and their slopes, writing into an object it is handed so a solver can call it many times a sample. The values of a measured germanium transistor, the OC44 of the Dallas Rangemaster, come with it, and the Rangemaster as a drive: a circuit a channel, run at 8 × the rate.


Compared with ngspice-42 by hand on 2026-11-21, the same circuit and values at 22.765313 °C (where its kT/q is 25.5 mV): the operating point within 1 nV, the small-signal gain at 1 kHz within 0.02 dB, and for the papers' sines (0.1 to 2 V peak, 100 Hz to 3 kHz) the THD within 0.1 points and the harmonics within 0.1 dB, plain and with the OC44's parasitics, which take 2 dB off the treble's gain as ngspice finds. The waveforms differ by up to 0.58 V at the clip's sharpest edges, where ngspice at a step of 1 µs and of 0.1 µs differ from each other as much. The test vectors hold that result.

Depends on: `dsp/filters`.

```ts
import { EbersMollPnp, OC44_EBERS_MOLL, PnpStage, RANGEMASTER, type PnpCurrents } from './index.ts';

const rangemaster = new PnpStage(RANGEMASTER, OC44_EBERS_MOLL, 384000, -9); // 8 × 48 kHz, on -9 V
const out = rangemaster.process(0.1); // volts in, volts out

const oc44 = new EbersMollPnp(OC44_EBERS_MOLL);
const currents: PnpCurrents = {
  base: 0,
  collector: 0,
  baseByEmitterBase: 0,
  baseByEmitterCollector: 0,
  collectorByEmitterBase: 0,
  collectorByEmitterCollector: 0,
};
oc44.currentsAt(0.128, 5.8, currents); // amplifying: about 0.23 mA at the collector, 1/108 of that at the base
```

| Export | What it does |
|---|---|
| `EbersMollPnp` | A PNP transistor; `currentsAt()` writes its base and collector currents and their four slopes at an emitter-base and an emitter-collector voltage into the object it is handed, and hands it back (`ebers-moll-pnp.ts`). |
| `EbersMollValues` | A transistor's saturation current, forward and reverse gains, forward and reverse ideality, and thermal voltage (`ebers-moll-pnp.ts`). |
| `PnpCurrents` | The base and collector currents leaving the transistor, and each one's slope by each junction voltage (`ebers-moll-pnp.ts`). |
| `DkModel` | A netlist as a state-space model by the nodal DK method at a sample rate, each capacitor by the trapezoidal rule; `knownVoltages()` gives the transistors' junction voltages before their own currents feed back, `feedback` how those currents move them, `advance()` the output at the solved currents, moving the capacitors on a sample; made at a rate of 0 it is the circuit at DC, `capacitorVoltages()` giving what `settle()` starts a model with (`dk-model.ts`). |
| `Netlist`, `Terminals` | A circuit of resistors, capacitors, voltage sources (the model's inputs, in order) and PNP transistors, with its output across two nodes; a part's two ends by node name, `ground` the reference (`dk-model.ts`). |
| `PnpStage` | A circuit of one PNP transistor, its first source the signal and its second the supply, run sample by sample: `process()` takes a signal voltage and gives the output voltage, the transistor solved by damped Newton at each sample (its steps limited as SPICE limits them), started at the circuit's DC operating point; `junctions` the last solved voltages, `stalls` the samples whose solve ran out of steps (`pnp-stage.ts`). |
| `withParasitics()`, `Parasitics` | A netlist with each transistor's base moved behind its base resistance and its junctions' capacitances across it, as parts the DK model takes in at no cost per sample; a transistor's base resistance and constant junction capacitances (`parasitics.ts`). |
| `RANGEMASTER`, `RANGEMASTER_FULL_RANGE` | The Dallas Rangemaster Treble Booster: one PNP as a common-emitter stage on -9 V, its nominal parts; inputs the signal and the supply. Full range: its input and output capacitors 100 times larger, flat within 1 dB from 200 Hz (`rangemaster.ts`). |
| `GermaniumDrive`, `GermaniumDriveParams` | The Rangemaster with the OC44 and its parasitics as a drive: `render()` runs each channel of a block through a circuit of its own at 8 × the rate, its input in volts by `drive` (dB), its output back in units by `level` (dB), `voicing` 0 the treble booster, 1 full range; a channel rests while silent, its sound died away, costing nothing; `latency` its oversampler's (`germanium-drive.ts`). |
| `OC44_EBERS_MOLL`, `OC44_PARASITICS` | The Mullard OC44, a germanium PNP, as measured by Holmes, Holters and van Walstijn (DAFx-17), at a thermal voltage of 25.5 mV; its base resistance, 32.83 Ω, and junction capacitances, 410 pF and 10 pF, from the same measurements (`transistors.ts`). |

Tests: `test/germanium-drive.test.js`, silence silent, a 1 kHz sine distorted as the stage alone at 8 × the rate distorts it, drive and level in dB, the treble booster against full range, a circuit a channel, its latency, exact silence once its sound has died away, and a sound after a rest as from a drive just made. `test/parasitics.test.js`, the base moved behind its resistance with the capacitances across it, and the Rangemaster's quiet gain with them at 1 and 14 kHz as ngspice finds it. `test/rangemaster-vectors.test.js`, the papers' sines through the Rangemaster, plain and with its parasitics, as `test-vectors/circuits/rangemaster.json` has them (written by `tools/make-circuit-vectors.js`). `test/pnp-stage.test.js`, the Rangemaster started at ngspice's operating point, silence staying there, a quiet 1 kHz sine at ngspice's small-signal gain within 0.02 dB, and a square far past full scale never stalling the solve. `test/dk-model.test.js`, a divider at once, an RC lowpass equal to the bilinear recursion sample for sample, and the Rangemaster's parts settling at ngspice's junction voltages with its transistor's currents held. `test/ebers-moll-pnp.test.js`, no current with no voltage, the forward gain while amplifying, tenfold the current for each 62 mV, less than the gain when saturated, the slopes against finite differences, and the currents at the Rangemaster's operating point as ngspice finds them with the same values.

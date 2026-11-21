# dsp/circuits

Analog circuits modeled from their parts, for a drive that sounds like the circuit and not like a curve. It starts with the transistor: a PNP as Ebers and Moll model it, two diodes whose currents grow exponentially with their voltages, most of one passing on to the collector. It gives a circuit solver the base and collector currents at the two junction voltages, and their slopes, writing into an object it is handed so a solver can call it many times a sample. The values of a measured germanium transistor, the OC44 of the Dallas Rangemaster, come with it.

Depends on: nothing.

```ts
import { EbersMollPnp, OC44_EBERS_MOLL, type PnpCurrents } from './index.ts';

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
| `OC44_EBERS_MOLL` | The Mullard OC44, a germanium PNP, as measured by Holmes, Holters and van Walstijn (DAFx-17), at a thermal voltage of 25.5 mV (`transistors.ts`). |

Tests: `test/ebers-moll-pnp.test.js`, no current with no voltage, the forward gain while amplifying, tenfold the current for each 62 mV, less than the gain when saturated, the slopes against finite differences, and the currents at the Rangemaster's operating point as ngspice finds them with the same values.

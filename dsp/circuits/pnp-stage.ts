// ---------- dsp/circuits/pnp-stage: a one-transistor circuit run sample by sample ----------
// At each sample the DK model gives the junction voltages but for the transistor's own currents, and those currents
// depend on the voltages: v = p + K·f(v). Damped Newton solves it: guess v, see how far the equation misses,
// step along its slope, repeat (Holmes, Holters and van Walstijn, DAFx-17: about 3.5 steps a sample).
// Each step of a forward junction is limited as SPICE's pnjlim limits it: past its critical voltage a step is cut to
// the log of how far it would go, so an edge that throws the base by volts lands in a few steps, not overshooting.
// Started at the circuit's DC operating point, found the same way with the capacitors open.
import { DkModel, type Netlist } from './dk-model.ts';
import { EbersMollPnp, type EbersMollValues, type PnpCurrents } from './ebers-moll-pnp.ts';

/** A junction's N·Vt, and its critical voltage: where its current's curve bends so hard a full step overshoots. */
interface JunctionLimit {
  readonly scale: number;
  readonly critical: number;
}

const TOLERANCE = 1e-10; // V: how far the equation may miss, far under anything heard
const MOST_STEPS = 100; // a sample's steps before it gives up and keeps the last guess, counted as a stall (as the thesis)
const DC_RATE = 0; // the rate a model is made at to stand for the circuit at DC: its capacitors open
const START_GUESS = [0, 0] as const; // at DC: no junction on, the limited steps walk it up

/** A circuit of one PNP transistor, its first source the signal and its second the supply, its output in volts. */
export class PnpStage {
  /** The last solved emitter-base and emitter-collector voltages. */
  readonly junctions = new Float64Array(2);
  readonly #model: DkModel;
  readonly #transistor: EbersMollPnp;
  readonly #forwardLimit: JunctionLimit;
  readonly #reverseLimit: JunctionLimit;
  readonly #inputs: Float64Array;
  readonly #currents: Float64Array;
  readonly #solved: PnpCurrents = {
    base: 0,
    collector: 0,
    baseByEmitterBase: 0,
    baseByEmitterCollector: 0,
    collectorByEmitterBase: 0,
    collectorByEmitterCollector: 0,
  };
  #stalls = 0;

  constructor(netlist: Netlist, transistor: EbersMollValues, sampleRate: number, supply: number) {
    if (netlist.transistors.length !== 1 || netlist.sources.length !== 2) {
      throw new Error('a PNP stage is one transistor with two sources: the signal, then the supply');
    }
    this.#transistor = new EbersMollPnp(transistor);
    this.#forwardLimit = junctionLimit(transistor.forwardIdeality, transistor);
    this.#reverseLimit = junctionLimit(transistor.reverseIdeality, transistor);
    this.#model = new DkModel(netlist, sampleRate);
    this.#inputs = new Float64Array([0, supply]);
    this.#currents = new Float64Array(2);
    this.#settle(netlist);
  }

  /** Samples where the solve ran out of steps; none in a sound circuit. */
  get stalls(): number {
    return this.#stalls;
  }

  /** The output voltage for a signal voltage, the circuit moved on a sample. */
  process(signal: number): number {
    this.#inputs[0] = signal;
    this.#solve(this.#model);
    return this.#model.advance(this.#inputs, this.#currents);
  }

  // the circuit at DC, silent: its junctions solved there, the real model's capacitors set to their voltages
  #settle(netlist: Netlist): void {
    const atDc = new DkModel(netlist, DC_RATE);
    this.junctions.set(START_GUESS);
    this.#solve(atDc);
    this.#model.settle(atDc.capacitorVoltages(this.#inputs, this.#currents));
  }

  // v = p + K·f(v), from the last sample's v; leaves v in junctions and f(v) in currents
  #solve(model: DkModel): void {
    const known = model.knownVoltages(this.#inputs);
    const [k00, k01, k10, k11] = model.feedback as unknown as [number, number, number, number];
    const solved = this.#solved;
    for (let step = 0; step < MOST_STEPS; step++) {
      const [emitterBase, emitterCollector] = this.junctions as unknown as [number, number];
      this.#transistor.currentsAt(emitterBase, emitterCollector, solved);
      this.#currents[0] = solved.base;
      this.#currents[1] = solved.collector;
      const missBase = known[0]! + k00 * solved.base + k01 * solved.collector - emitterBase;
      const missCollector = known[1]! + k10 * solved.base + k11 * solved.collector - emitterCollector;
      if (Math.abs(missBase) < TOLERANCE && Math.abs(missCollector) < TOLERANCE) {
        return;
      }
      // the miss's slope: K·(the currents' slopes) - 1
      const j00 = k00 * solved.baseByEmitterBase + k01 * solved.collectorByEmitterBase - 1;
      const j01 = k00 * solved.baseByEmitterCollector + k01 * solved.collectorByEmitterCollector;
      const j10 = k10 * solved.baseByEmitterBase + k11 * solved.collectorByEmitterBase;
      const j11 = k10 * solved.baseByEmitterCollector + k11 * solved.collectorByEmitterCollector - 1;
      const determinant = j00 * j11 - j01 * j10;
      const stepBase = (j01 * missCollector - j11 * missBase) / determinant;
      const stepCollector = (j10 * missBase - j00 * missCollector) / determinant;
      const nextBase = limited(emitterBase + stepBase, emitterBase, this.#forwardLimit);
      const collectorBase = emitterBase - emitterCollector;
      const nextCollectorBase = limited(collectorBase + stepBase - stepCollector, collectorBase, this.#reverseLimit);
      this.junctions[0] = nextBase;
      this.junctions[1] = nextBase - nextCollectorBase;
    }
    this.#stalls++;
  }
}

function junctionLimit(ideality: number, { thermalVoltage, saturationCurrent }: EbersMollValues): JunctionLimit {
  const scale = ideality * thermalVoltage;
  return { scale, critical: scale * Math.log(scale / (Math.SQRT2 * saturationCurrent)) }; // as SPICE works it out
}

/** A junction's next voltage, a forward step past its critical voltage cut to the log of how far it would go (pnjlim). */
function limited(next: number, last: number, { scale, critical }: JunctionLimit): number {
  if (next <= critical || Math.abs(next - last) <= 2 * scale) {
    return next;
  }
  if (last <= 0) {
    return scale * Math.log(next / scale);
  }
  const reach = 1 + (next - last) / scale;
  if (reach <= 0) {
    return critical;
  }
  return last + scale * Math.log(reach);
}

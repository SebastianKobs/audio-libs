// ---------- dsp/circuits/ebers-moll-pnp: a PNP transistor as Ebers and Moll model it, two diodes and a gain ----------
// Each junction is a diode, its current exponential in its voltage; most of the emitter-base diode's current
// passes on to the collector, one part in the forward gain leaves at the base. The collector-base diode,
// on only when saturated, pulls current back, one part in the reverse gain at the base.
// The unknowns are the emitter-base and emitter-collector voltages, as a circuit solver takes them
// (Holmes and van Walstijn, DAFx-16, equation 4); the collector-base voltage is their difference.

/** A transistor's Ebers-Moll values: currents in A, voltages in V. */
export interface EbersMollValues {
  /** The diodes' saturation current: how much flows at a given voltage. */
  readonly saturationCurrent: number;
  /** Collector current per base current, amplifying. */
  readonly forwardGain: number;
  /** Emitter current per base current, run backward. */
  readonly reverseGain: number;
  /** How steep the emitter-base diode is: 1 is ideal. */
  readonly forwardIdeality: number;
  /** How steep the collector-base diode is: 1 is ideal. */
  readonly reverseIdeality: number;
  /** kT/q at the temperature the values were measured at. */
  readonly thermalVoltage: number;
}

/** The base and collector currents leaving the transistor, and each one's slope by each junction voltage, in A and A/V. */
export interface PnpCurrents {
  base: number;
  collector: number;
  baseByEmitterBase: number;
  baseByEmitterCollector: number;
  collectorByEmitterBase: number;
  collectorByEmitterCollector: number;
}

/** A PNP transistor's currents at its junction voltages, its values worked into the law's factors once. */
export class EbersMollPnp {
  readonly #saturationCurrent: number;
  readonly #forwardScale: number; // 1 / (Nf·Vt): the emitter-base exponent per volt
  readonly #reverseScale: number;
  readonly #forwardBase: number; // Is / βf: the forward diode's share at the base
  readonly #reverseBase: number;

  constructor(values: EbersMollValues) {
    this.#saturationCurrent = values.saturationCurrent;
    this.#forwardScale = 1 / (values.forwardIdeality * values.thermalVoltage);
    this.#reverseScale = 1 / (values.reverseIdeality * values.thermalVoltage);
    this.#forwardBase = values.saturationCurrent / values.forwardGain;
    this.#reverseBase = values.saturationCurrent / values.reverseGain;
  }

  /**
   * The currents at an emitter-base and an emitter-collector voltage, written into `into` and handed back:
   * a solver calls it many times a sample, so it makes nothing new.
   */
  currentsAt(emitterBase: number, emitterCollector: number, into: PnpCurrents): PnpCurrents {
    const forwardExp = Math.exp(emitterBase * this.#forwardScale);
    const reverseExp = Math.exp((emitterBase - emitterCollector) * this.#reverseScale); // collector-base
    const forward = forwardExp - 1;
    const reverse = reverseExp - 1;
    const forwardSlope = forwardExp * this.#forwardScale;
    const reverseSlope = reverseExp * this.#reverseScale; // by the collector-base voltage
    const pulledBack = this.#saturationCurrent + this.#reverseBase; // the reverse diode's pull on the collector
    into.base = this.#forwardBase * forward + this.#reverseBase * reverse;
    into.collector = this.#saturationCurrent * forward - pulledBack * reverse;
    // the collector-base voltage rises with the emitter-base one and falls with the emitter-collector one
    into.baseByEmitterBase = this.#forwardBase * forwardSlope + this.#reverseBase * reverseSlope;
    into.baseByEmitterCollector = -this.#reverseBase * reverseSlope;
    into.collectorByEmitterBase = this.#saturationCurrent * forwardSlope - pulledBack * reverseSlope;
    into.collectorByEmitterCollector = pulledBack * reverseSlope;
    return into;
  }
}

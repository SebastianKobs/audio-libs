// ---------- dsp/circuits/germanium-drive: the Rangemaster as a drive, a circuit a channel, at 8 × the rate ----------
// A sound comes in as units and the circuit works in volts: the drive says how many volts a unit is, the level how
// many units a volt comes back as. The OC44 with its parasitics, the extension its paper puts first.
// Run 8 times as fast between two windowed-sinc filters, so the clip's partials don't fold.
import { Oversampler } from '../filters/index.ts';
import type { Netlist } from './dk-model.ts';
import { withParasitics } from './parasitics.ts';
import { PnpStage } from './pnp-stage.ts';
import { RANGEMASTER, RANGEMASTER_FULL_RANGE } from './rangemaster.ts';
import { OC44_EBERS_MOLL, OC44_PARASITICS } from './transistors.ts';

/** What a block is rendered at: the drive and the level in dB, the voicing by its index. */
export interface GermaniumDriveParams {
  /** The input's volts per unit, in dB: 0 is a full-scale sine at 1 V peak. */
  readonly drive: number;
  /** The output's units per volt, in dB. */
  readonly level: number;
  /** 0 the treble booster as built, 1 full range. */
  readonly voicing: number;
}

// a channel's circuit and the oversampler around it, and the shape that runs the circuit
interface Channel {
  readonly oversampler: Oversampler;
  readonly shape: (volts: number) => number;
}

const FACTOR = 8; // as Holmes, Holters and van Walstijn listened to it
const SUPPLY = -9; // V
const VOICINGS: readonly Netlist[] = [RANGEMASTER, RANGEMASTER_FULL_RANGE].map((netlist) =>
  withParasitics(netlist, OC44_PARASITICS),
);

/** The Rangemaster as a drive: each channel of a block through a circuit of its own, kept from block to block. */
export class GermaniumDrive {
  /** Samples it comes out late: its oversampler's. */
  readonly latency: number;
  readonly #sampleRate: number;
  #channels: Channel[] = []; // a channel's each, made as its channel first comes
  #voicing = 0;

  constructor({ sampleRate }: { sampleRate: number }) {
    this.#sampleRate = sampleRate;
    this.latency = new Oversampler(FACTOR).latency;
  }

  /** A block of channels driven into `outputs`; a channel with no input is silent. */
  render(
    inputs: readonly (ArrayLike<number> | undefined)[],
    outputs: readonly Float32Array[],
    { drive, level, voicing }: GermaniumDriveParams,
  ): void {
    const picked = Math.round(voicing) === 1 ? 1 : 0;
    if (picked !== this.#voicing) {
      this.#voicing = picked;
      this.#channels = []; // a circuit of the other voicing, started at its own operating point
    }
    const volts = 10 ** (drive / 20);
    const units = 10 ** (level / 20);
    outputs.forEach((output, index) => {
      const input = inputs[index];
      if (!input) {
        output.fill(0);
        return;
      }
      const channel = (this.#channels[index] ??= this.#channel());
      for (let i = 0; i < output.length; i++) {
        output[i] = units * channel.oversampler.process(volts * (input[i] ?? 0), channel.shape);
      }
    });
  }

  #channel(): Channel {
    const stage = new PnpStage(VOICINGS[this.#voicing]!, OC44_EBERS_MOLL, FACTOR * this.#sampleRate, SUPPLY);
    return { oversampler: new Oversampler(FACTOR), shape: (volts) => stage.process(volts) };
  }
}

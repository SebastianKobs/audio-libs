// Writes test-vectors/circuits/rangemaster.json from dsp/circuits/: the Dallas Rangemaster with the OC44 as
// Ebers-Moll, plain and with its parasitics (its base resistance and junction capacitances), at 8 × 48 kHz,
// fed the sines its papers test it with (Holmes and van Walstijn, DAFx-16; Holmes, Holters and van Walstijn,
// DAFx-17), each its output's last period, sampled, and its harmonics.
// Compared once by hand with ngspice-42 (2026-11-21): the harmonics within 0.1 dB, the THD within 0.1 points.
// The unit tests hold the stage to the vectors, so they're written again only on purpose:
// node --import ./tools/yaml-hooks.js tools/make-circuit-vectors.js
import { OC44_EBERS_MOLL, OC44_PARASITICS, PnpStage, RANGEMASTER, withParasitics } from '../dsp/circuits/index.ts';
import { significant, table, written } from './vectors.js';

const RATE = 384000;
const SUPPLY = -9;
const SECONDS = 0.1; // the coupling capacitors settled; the emitter's bypass, 0.18 s, still moving, as it is
const LEVELS = [0.1, 0.3, 1, 2]; // V peak
const FREQUENCIES = [100, 1000, 3000]; // Hz, each a whole number of samples a period at the rate
const POINTS = 32; // of the last period
const HARMONICS = 5;

const cases = [false, true].flatMap((parasitics) =>
  LEVELS.flatMap((level) => FREQUENCIES.map((hz) => rendered(parasitics, level, hz))),
);
written(
  'circuits/rangemaster.json',
  table({
    about:
      'The Dallas Rangemaster (dsp/circuits/ RANGEMASTER, PnpStage) with the OC44 as Ebers-Moll, plain or with its parasitics (OC44_PARASITICS, through withParasitics), on -9 V, at 384 kHz, started at its operating point, fed a sine of a level (V peak) and frequency (Hz) for 0.1 s. Its output (V) at 32 points of the last period, from its start, and the amplitudes of its harmonics 1 to 5 over that period (V). Written by tools/make-circuit-vectors.js from the library alone.',
    cases,
  }),
);

function rendered(parasitics, level, hz) {
  const netlist = parasitics ? withParasitics(RANGEMASTER, OC44_PARASITICS) : RANGEMASTER;
  const stage = new PnpStage(netlist, OC44_EBERS_MOLL, RATE, SUPPLY);
  const length = Math.round(SECONDS * RATE);
  const output = new Float64Array(length);
  for (let n = 0; n < length; n++) {
    output[n] = stage.process(level * Math.sin((2 * Math.PI * hz * n) / RATE));
  }
  const period = RATE / hz;
  const last = output.subarray(length - period);
  return {
    parasitics,
    level,
    hz,
    points: Array.from({ length: POINTS }, (_, k) => significant(last[Math.floor((k * period) / POINTS)])),
    harmonics: Array.from({ length: HARMONICS }, (_, k) => significant(amplitude(last, k + 1))),
  };
}

function amplitude(period, harmonic) {
  let [sine, cosine] = [0, 0];
  period.forEach((value, i) => {
    const phase = (2 * Math.PI * harmonic * i) / period.length;
    sine += value * Math.sin(phase);
    cosine += value * Math.cos(phase);
  });
  return (2 * Math.hypot(sine, cosine)) / period.length;
}

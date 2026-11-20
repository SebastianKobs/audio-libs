// ---------- libs/dsp/dynamics/compressor-curve: where a browser's compressor node brings a steady sound ----------
// The level the node brings a steady sound to, and the make-up gain it adds.
// Written from memory of Chromium's DynamicsCompressorKernel, not opened.
// Everything in dBFS; the curve itself is worked out in linear gain, as the node does.

export interface CompressorSettings {
  threshold: number; // dBFS: where it starts to act
  knee: number; // dB: how far above the threshold it takes to reach the full ratio
  ratio: number; // dB in for each dB out, past the knee
}

// the level in dBFS a steady sound at `level` comes out at, make-up not counted
export function compressedLevel(level: number, settings: CompressorSettings): number {
  const { threshold, knee, ratio } = settings;
  if (level <= threshold) {
    return level;
  }
  if (knee <= 0) {
    return threshold + (level - threshold) / ratio;
  }
  const thresholdGain = gainOfdB(threshold);
  const k = kneeSharpness(settings);
  const kneeEndLevel = threshold + knee;
  if (level < kneeEndLevel) {
    return dBOfGain(kneeCurve(gainOfdB(level), thresholdGain, k));
  }
  const kneeEndOut = dBOfGain(kneeCurve(gainOfdB(kneeEndLevel), thresholdGain, k));
  return kneeEndOut + (level - kneeEndLevel) / ratio;
}

// the make-up gain the node adds, in dB: 0.6 of what full scale is brought down by
export function compressorMakeup(settings: CompressorSettings): number {
  return -0.6 * compressedLevel(0, settings);
}

// the k whose curve has the slope 1 / ratio at the knee's end: 15 halvings, in the geometric middle, between 0.1 and 10000, from 5
function kneeSharpness({ threshold, knee, ratio }: CompressorSettings): number {
  const thresholdGain = gainOfdB(threshold);
  const kneeEnd = gainOfdB(threshold + knee);
  let lower = 0.1;
  let upper = 10000;
  let k = 5;
  for (let step = 0; step < 15; step++) {
    if (slopeAt(kneeEnd, thresholdGain, k) < 1 / ratio) {
      upper = k; // k too high: flatter than wanted
    } else {
      lower = k;
    }
    k = Math.sqrt(lower * upper);
  }
  return k;
}

// the knee curve's slope in dB out a dB in, taken between x and 1.001·x
function slopeAt(gain: number, threshold: number, k: number): number {
  const farther = gain * 1.001;
  return (
    (dBOfGain(kneeCurve(farther, threshold, k)) - dBOfGain(kneeCurve(gain, threshold, k)))
    / (dBOfGain(farther) - dBOfGain(gain))
  );
}

// the knee's curve, from the threshold on: t + (1 − e^(−k·(x − t))) / k, a curve that starts at slope 1 and bends flatter as k grows
function kneeCurve(gain: number, threshold: number, k: number): number {
  return threshold + (1 - Math.exp(-k * (gain - threshold))) / k;
}

function dBOfGain(gain: number): number {
  return 20 * Math.log10(gain);
}

function gainOfdB(dB: number): number {
  return 10 ** (dB / 20);
}

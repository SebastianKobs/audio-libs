// ---------- libs/web-audio-engine/buffers: the samples of the buffers a plan names. Pure: no Web Audio ----------
// Each gives one array of samples a channel, made with rand() (Math.random, or a seeded one in tests).
// noise: so many seconds of white noise, one channel (a noise block's 'noise', 2 s, and 'breath', 0.2 s).
// impulse: a reverb's impulse response, two channels of noise that darkens as it decays: a lowpass on it closes over its length, and
// it fades as (1 − t)^2.5

export function noise(seconds: number, sampleRate: number, rand: () => number): [Float32Array] {
  const samples = new Float32Array(Math.floor(sampleRate * seconds));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = rand() * 2 - 1;
  }
  return [samples];
}
export function impulse(seconds: number, sampleRate: number, rand: () => number): [Float32Array, Float32Array] {
  const len = Math.floor(sampleRate * seconds);
  const side = () => {
    const samples = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (rand() * 2 - 1 - lp) * (0.35 - 0.3 * t); // the tail gets darker over time
      samples[i] = lp * Math.pow(1 - t, 2.5);
    }
    return samples;
  };
  return [side(), side()];
}

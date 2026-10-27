// ---------- libs/formats/wav: float channels to a 16-bit PCM WAV file's bytes, TPDF-dithered ----------

/** What a file is made from: its channels (floats, full scale ±1), their rate and the draws for the dither. */
export interface WavSetup {
  channels: readonly Float32Array[];
  sampleRate: number;
  // a draw in [0, 1), handed in so a test seeds it
  random: () => number;
}

const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const FULL_SCALE = 32767; // symmetric: -1 and 1 sit as far from zero
const LOWEST = -32768;

export function encodeWav(setup: WavSetup): Uint8Array {
  const { channels, sampleRate, random } = setup;
  const frames = framesOf(channels, sampleRate);
  const dataBytes = frames * channels.length * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  writeHeader(view, channels.length, sampleRate, dataBytes);
  writeSamples(view, channels, frames, random);
  return bytes;
}

// the length every channel shares, once the setup is checked
function framesOf(channels: readonly Float32Array[], sampleRate: number): number {
  const [first] = channels;
  if (!first) {
    throw new Error('A WAV file needs at least one channel');
  }
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error(`A WAV file's sample rate is a positive whole number, not ${sampleRate}`);
  }
  if (channels.some((channel) => channel.length !== first.length)) {
    throw new Error('Every channel of a WAV file has the same length');
  }
  return first.length;
}

function writeHeader(view: DataView, channelCount: number, sampleRate: number, dataBytes: number): void {
  const frameBytes = channelCount * BYTES_PER_SAMPLE;
  writeText(view, 0, 'RIFF');
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // the fmt chunk's size for PCM
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * frameBytes, true);
  view.setUint16(32, frameBytes, true);
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeText(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
}

function writeText(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function writeSamples(view: DataView, channels: readonly Float32Array[], frames: number, random: () => number): void {
  let offset = HEADER_BYTES;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      view.setInt16(offset, pcmSample(channel[frame] ?? 0, random), true);
      offset += BYTES_PER_SAMPLE;
    }
  }
}

// clamped first so the dither can't wrap; rounded after the dither is added, in LSBs; clamped again for its last LSB
function pcmSample(value: number, random: () => number): number {
  const clamped = Math.max(-1, Math.min(1, value));
  const dither = random() - 0.5 + (random() - 0.5);
  return Math.max(LOWEST, Math.min(FULL_SCALE, Math.round(clamped * FULL_SCALE + dither)));
}

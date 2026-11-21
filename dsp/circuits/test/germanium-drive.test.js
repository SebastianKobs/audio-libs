// The germanium drive's unit tests (dsp/circuits/): the Rangemaster with the OC44 and its parasitics, run at 8 × the
// rate, a stage a channel, its input in volts by its drive and its output back in units by its level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GermaniumDrive, OC44_EBERS_MOLL, OC44_PARASITICS, PnpStage, RANGEMASTER, withParasitics } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const BLOCK = 128;
const TREBLE = { drive: 0, level: 0, voicing: 0 };

// a sine run through in blocks, each channel's output kept
function rendered(drive, params, channels) {
  const length = channels[0].length;
  const outputs = channels.map(() => new Float32Array(length));
  for (let start = 0; start < length; start += BLOCK) {
    const end = Math.min(length, start + BLOCK);
    drive.render(
      channels.map((channel) => channel.subarray(start, end)),
      outputs.map((output) => output.subarray(start, end)),
      params,
    );
  }
  return outputs;
}

function sine(hz, seconds, level) {
  return Float32Array.from(
    { length: Math.round(seconds * RATE) },
    (_, n) => level * Math.sin((2 * Math.PI * hz * n) / RATE),
  );
}

// the amplitudes of the first harmonics over the last tenth of a second, whole periods
function harmonics(samples, hz, count = 3) {
  const length = Math.round(RATE / 10);
  const start = samples.length - length;
  return Array.from({ length: count }, (_, k) => {
    let [s, c] = [0, 0];
    for (let n = start; n < samples.length; n++) {
      const phase = (2 * Math.PI * (k + 1) * hz * n) / RATE;
      s += samples[n] * Math.sin(phase);
      c += samples[n] * Math.cos(phase);
    }
    return (2 * Math.hypot(s, c)) / length;
  });
}

const db = (ratio) => 20 * Math.log10(ratio);

test('silence comes out silent: it starts at its operating point, nothing to settle', () => {
  const [output] = rendered(new GermaniumDrive({ sampleRate: RATE }), TREBLE, [new Float32Array(RATE / 10)]);
  assert.ok(
    output.every((x) => Math.abs(x) < 1e-6),
    `${Math.max(...output.map(Math.abs))}`,
  );
});

test('distorts as the circuit does at 8 × the rate: a 1 kHz sine at 0.1 V its 2nd and 3rd as the stage alone makes them', () => {
  const [output] = rendered(new GermaniumDrive({ sampleRate: RATE }), TREBLE, [sine(1000, 0.3, 0.1)]);
  const stage = new PnpStage(withParasitics(RANGEMASTER, OC44_PARASITICS), OC44_EBERS_MOLL, 8 * RATE, -9);
  const direct = Float32Array.from({ length: Math.round(0.3 * 8 * RATE) }, (_, n) =>
    stage.process(0.1 * Math.sin((2 * Math.PI * 1000 * n) / (8 * RATE))),
  );
  const theirs = harmonics(
    direct.filter((_, n) => n % 8 === 0),
    1000,
  );
  const ours = harmonics(output, 1000);
  near(db(ours[0]), db(theirs[0]), 'the note', 0.1);
  near(db(ours[1] / ours[0]), db(theirs[1] / theirs[0]), 'the 2nd', 0.3);
  near(db(ours[2] / ours[0]), db(theirs[2] / theirs[0]), 'the 3rd', 0.3);
});

test('its drive is the input in volts per unit, its level the output in units per volt, both in dB', () => {
  const input = sine(1000, 0.3, 0.1);
  const [plain] = rendered(new GermaniumDrive({ sampleRate: RATE }), TREBLE, [input]);
  const [driven] = rendered(new GermaniumDrive({ sampleRate: RATE }), { ...TREBLE, drive: 20 }, [
    sine(1000, 0.3, 0.01),
  ]);
  const [quieter] = rendered(new GermaniumDrive({ sampleRate: RATE }), { ...TREBLE, level: -6 }, [input]);
  near(harmonics(driven, 1000)[0], harmonics(plain, 1000)[0], 'a tenth the input, 20 dB more drive: the same', 1e-4);
  near(harmonics(quieter, 1000)[0] / harmonics(plain, 1000)[0], 10 ** (-6 / 20), 'level -6 dB', 1e-6);
});

test('as a treble booster it lifts 1 kHz far over 100 Hz; full range, 200 Hz and 1 kHz alike', () => {
  const quietGain = (voicing, hz) =>
    db(
      harmonics(
        rendered(new GermaniumDrive({ sampleRate: RATE }), { ...TREBLE, voicing }, [sine(hz, 0.5, 1e-4)])[0],
        hz,
      )[0] / 1e-4,
    );
  assert.ok(quietGain(0, 1000) - quietGain(0, 100) > 15, 'the treble booster');
  near(quietGain(1, 1000), quietGain(1, 200), 'full range', 1); // under it the emitter's bypass, kept as built, takes some off
});

test('each channel its own circuit: a silent channel stays silent beside a loud one', () => {
  const [loud, silent] = rendered(new GermaniumDrive({ sampleRate: RATE }), TREBLE, [
    sine(1000, 0.1, 0.5),
    new Float32Array(RATE / 10),
  ]);
  assert.ok(Math.max(...loud.map(Math.abs)) > 0.5);
  assert.ok(silent.every((x) => Math.abs(x) < 1e-6));
});

test('names its latency, the oversampler’s', () => {
  assert.equal(new GermaniumDrive({ sampleRate: RATE }).latency, 32);
});

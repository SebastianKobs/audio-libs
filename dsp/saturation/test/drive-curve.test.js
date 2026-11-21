// The Drive curves' unit tests (dsp/saturation/): its styles' curves, the auto gain after them. A
// sine fed through the curve as a WaveShaper reads its table, its harmonics read off one period.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoGain, curveGain, driveCurve, DRIVE_STYLES, CURVE_SPAN, REFERENCE } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const PERIOD = 1024; // samples of one period of the test sine: each harmonic on a bin of its own
const dB = (share) => 20 * Math.log10(share);
const share = (decibels) => 10 ** (decibels / 20);
// the curve at an input between -1 and 1 as a WaveShaper reads it: linear between its points, its ends past ±1
const through = (curve, x) => {
  const at = ((Math.min(1, Math.max(-1, x)) + 1) / 2) * (curve.length - 1);
  const i = Math.min(curve.length - 2, Math.floor(at));
  return curve[i] + (curve[i + 1] - curve[i]) * (at - i);
};
// a sine of a peak level through a style's curve, driven as the Drive drives it, its auto gain after
function driven(style, { level, drive, punish = 0, auto = 1 }) {
  const curve = driveCurve(style);
  const gain = curveGain(style, drive, punish);
  const after = autoGain(style, gain) ** auto;
  return Float32Array.from(
    { length: PERIOD },
    (_, i) => after * through(curve, (gain * level * Math.sin((2 * Math.PI * i) / PERIOD)) / CURVE_SPAN),
  );
}
// its level as heard: the RMS, its DC taken off, as the Drive's DC block does
const rms = (samples) => {
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return Math.sqrt(samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length);
};
// each harmonic's level, the fundamental the first
const harmonics = (samples, upTo = 12) =>
  Array.from({ length: upTo }, (_, k) => {
    let re = 0;
    let im = 0;
    for (let i = 0; i < samples.length; i++) {
      re += samples[i] * Math.cos((2 * Math.PI * (k + 1) * i) / samples.length);
      im += samples[i] * Math.sin((2 * Math.PI * (k + 1) * i) / samples.length);
    }
    return Math.hypot(re, im);
  });
// all the harmonics over the fundamental, summed, in dB
const distortion = (samples) => {
  const [fundamental, ...rest] = harmonics(samples);
  return dB(Math.sqrt(rest.reduce((sum, h) => sum + h * h, 0)) / fundamental);
};
const sineRms = (level) => level / Math.SQRT2;

test('the styles, by character: smooth to crunch', () => {
  assert.deepEqual(DRIVE_STYLES, ['smooth', 'console', 'germanium', 'triode', 'pentode']);
});

test("silence through every style's curve stays silent: a point at 0, its bias taken off", () => {
  for (const style of DRIVE_STYLES) {
    const curve = driveCurve(style);
    assert.equal(curve.length % 2, 1, `${style}: an odd count of points`);
    assert.equal(curve[(curve.length - 1) / 2], 0, style);
    assert.equal(through(curve, 0), 0, style);
    const quiet = driven(style, { level: 0, drive: share(36), punish: 1 });
    assert.ok(
      quiet.every((x) => x === 0),
      `${style}: silence driven hardest`,
    );
  }
});

test("the curve's knee at full scale: a quiet sound passes near unity at no drive, auto off", () => {
  for (const style of DRIVE_STYLES) {
    const out = driven(style, { level: share(-60), drive: 1, auto: 0 });
    const gain = rms(out) / sineRms(share(-60));
    const heat = curveGain(style, 1, 0);
    assert.ok(
      Math.abs(dB(gain / heat)) < 0.1,
      `${style}: ${dB(gain).toFixed(2)} dB, its heat ${dB(heat).toFixed(1)} dB`,
    );
  }
});

test("auto: a sine at the reference, -18 dBFS, comes out within 0.5 dB of it, however hard it's driven", () => {
  near(dB(REFERENCE), -18);
  for (const style of DRIVE_STYLES) {
    for (const punish of [0, 1]) {
      for (let decibels = 0; decibels <= 36; decibels += 3) {
        const out = driven(style, { level: REFERENCE, drive: share(decibels), punish });
        const off = dB(rms(out) / sineRms(REFERENCE));
        assert.ok(
          Math.abs(off) <= 0.5,
          `${style} +${decibels} dB${punish ? ' punished' : ''}: ${off.toFixed(2)} dB off`,
        );
      }
    }
  }
});

test('a quiet sound driven gets dirty: a -30 dBFS sine at +30 dB comes out louder, its main harmonic above -30 dB', () => {
  const main = { smooth: 2, console: 3, germanium: 2, triode: 2, pentode: 3 }; // even-harmonic styles' 2nd, odd ones' 3rd
  for (const style of DRIVE_STYLES) {
    const level = share(-30);
    const out = driven(style, { level, drive: share(30) });
    assert.ok(rms(out) > sineRms(level), `${style}: ${dB(rms(out) / sineRms(level)).toFixed(1)} dB`);
    const h = harmonics(out);
    const harmonic = dB(h[main[style] - 1] / h[0]);
    assert.ok(harmonic > -30, `${style}: H${main[style]} at ${harmonic.toFixed(1)} dB`);
  }
});

test("the styles' harmonics at the same drive: smooth fewest, console about germanium, then triode, pentode most", () => {
  for (const decibels of [18, 24]) {
    const at = Object.fromEntries(
      DRIVE_STYLES.map((style) => [style, distortion(driven(style, { level: REFERENCE, drive: share(decibels) }))]),
    );
    const said = DRIVE_STYLES.map((style) => `${style} ${at[style].toFixed(1)}`).join(', ');
    assert.ok(at.smooth < Math.min(at.console, at.germanium), `+${decibels}: ${said}`);
    near(at.console, at.germanium, `+${decibels}: console about germanium: ${said}`, 3);
    assert.ok(Math.max(at.console, at.germanium) < at.triode, `+${decibels}: ${said}`);
    assert.ok(at.triode < at.pentode, `+${decibels}: ${said}`);
  }
});

test('the even-harmonic styles bend asymmetrically, the odd ones near symmetric', () => {
  const second = (style) => {
    const h = harmonics(driven(style, { level: REFERENCE, drive: share(18) }));
    return dB(h[1] / h[0]);
  };
  for (const style of ['smooth', 'germanium', 'triode']) {
    assert.ok(second(style) > -30, `${style}: H2 ${second(style).toFixed(1)}`);
  }
  for (const style of ['console', 'pentode']) {
    assert.ok(second(style) < -30, `${style}: H2 ${second(style).toFixed(1)}`);
  }
});

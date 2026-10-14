// A param's taper (mockup/src/libs/params/taper.ts, U2c4a; libs/synth/'s until U2c4a2): where a value lies on a control, a lane or a CC, 0 at its bottom to 1 at its
// top, and back, declared with the param as VST3 and AU declare theirs, so every surface turns a position into a value one way
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faderGain, faderPosition, positionOf, valueAt } from '../index.ts';

const near = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual}, not ${expected}`);

// the fader law, as a console's and Ableton's: a fader's position to its gain by dB, not in a straight line, so unity sits two thirds of
// the way up and the bottom of its travel is the long drop to silence (mixer-surface/fader.ts's until U2c4a)
test("the fader law: silence at the bottom, unity two thirds up, +6 dB at the top, the master's unity at its top; a position back from its gain", () => {
  assert.deepEqual(
    [faderGain(0), faderGain(2 / 3), faderGain(1)].map((g) => +g.toFixed(9)),
    [0, 1, 2],
  );
  assert.equal(+faderGain(1, 1).toFixed(9), 1, 'the master, its top 1: unity at its top');
  assert.ok(Math.abs(20 * Math.log10(faderGain(1 / 3)) + 10.3) < 0.1, 'a third of the way up: about -10 dB');
  for (const p of [0.05, 0.3, 0.5, 2 / 3, 0.9, 1]) {
    assert.ok(Math.abs(faderPosition(faderGain(p)) - p) < 1e-9, `${p}: back again`);
  }
  assert.equal(faderPosition(4), 1, 'past the top: at the top');
});

test("a param's taper: a gain by the fader law, a frequency by octaves, the rest in a line on its range, a switch by its step; each position back to its value, held to the range", () => {
  const gain = { name: 'level', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
  near(positionOf(gain, 1), 2 / 3, 'unity two thirds up');
  near(valueAt(gain, 2 / 3), 1, 'and back');
  const cutoff = { name: 'cutoff', unit: 'Hz', range: [20, 20480, 1], taper: 'octaves' };
  near(positionOf(cutoff, 640), 0.5, 'an octave each tenth: halfway up');
  near(valueAt(cutoff, 0.5), 640, 'and back');
  const pan = { name: 'pan', range: [-1, 1, 0.01] };
  near(positionOf(pan, 0), 0.5, 'a line, its default: centred, halfway');
  near(valueAt(pan, 0.25), -0.5, 'and back');
  const mute = { name: 'mute', range: [0, 1, 1] };
  assert.deepEqual([positionOf(mute, 1), valueAt(mute, 0.4), valueAt(mute, 0.6)], [1, 0, 1], 'a switch, by its step');
  assert.deepEqual([positionOf(pan, 3), positionOf(cutoff, 1)], [1, 0], 'held to its range');
});

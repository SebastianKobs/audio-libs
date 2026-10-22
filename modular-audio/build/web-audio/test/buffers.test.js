// The buffers a noise or a reverb plays (mockup/src/libs/modular-audio/build/web-audio/buffers.ts; the old engine's and the FX modules' tests until
// LAY16): a reverb's impulse response the same samples the garden's reverb had, made once; a noise by its length.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from './audio-stand-in.js';
import { Buffers, impulse, noise } from '../index.ts';
import { seeded } from '../../../../base/util/index.ts';

// makeIR(), as the garden's reverb made its impulse response, its random draws given
function makeIR(seconds, rate, rand) {
  const length = Math.floor(rate * seconds);
  const channels = [];
  for (let channel = 0; channel < 2; channel++) {
    const samples = new Float32Array(length);
    let lowpassed = 0;
    for (let index = 0; index < length; index++) {
      const t = index / length;
      lowpassed += (rand() * 2 - 1 - lowpassed) * (0.35 - 0.3 * t);
      samples[index] = lowpassed * Math.pow(1 - t, 2.5);
    }
    channels.push(samples);
  }
  return channels;
}

test("a reverb's impulse response the same samples the garden's reverb had, two channels darkening as they decay; made once; a noise by its length", () => {
  assert.deepEqual(impulse(0.05, 48000, seeded(7)), makeIR(0.05, 48000, seeded(7)));
  const [white] = noise(0.01, 48000, seeded(7));
  assert.equal(white.length, 480);
  const buffers = new Buffers(new StandInContext(() => 0), seeded(7));
  const room = buffers.impulse(3.5);
  assert.deepEqual([room.numberOfChannels, room.length], [2, Math.floor(48000 * 3.5)]);
  assert.equal(buffers.impulse(3.5), room, 'made once');
});

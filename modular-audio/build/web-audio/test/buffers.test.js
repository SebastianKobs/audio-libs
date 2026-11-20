// The buffers a noise or a reverb plays (mockup/src/libs/modular-audio/build/web-audio/buffers.ts):
// a reverb's impulse response, two channels darkening as they decay, made once; a noise by its length;
// a room's, an impulse of a design, made once for each design.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from './audio-stand-in.js';
import { Buffers, impulse, noise } from '../index.ts';
import { seeded } from '../../../../base/util/index.ts';
import { near } from '../../../../base/util/test/near.js';

// the mean size of a stretch of samples
function loudness(samples, from, to) {
  const stretch = samples.slice(from, to);
  return stretch.reduce((sum, sample) => sum + Math.abs(sample), 0) / stretch.length;
}

test("a reverb's impulse response: two channels, the same from the same draws, louder at its start than at its end; made once; a noise by its length", () => {
  const response = impulse(0.05, 48000, seeded(7));
  assert.equal(response.length, 2, 'two channels');
  assert.deepEqual(response, impulse(0.05, 48000, seeded(7)), 'the same draws, the same samples');
  const [left] = response;
  const tenth = left.length / 10;
  assert.ok(loudness(left, 0, tenth) > loudness(left, left.length - tenth), 'decaying');
  const [white] = noise(0.01, 48000, seeded(7));
  assert.equal(white.length, 480);
  const buffers = new Buffers(new StandInContext(() => 0), seeded(7));
  const room = buffers.impulse(3.5);
  assert.deepEqual([room.numberOfChannels, room.length], [2, Math.floor(48000 * 3.5)]);
  assert.equal(buffers.impulse(3.5), room, 'made once');
});

test("a room's impulse by its design: two channels of its length, energy 1 a side, two draws; made once for a design, another design another buffer", () => {
  let draws = 0;
  const next = seeded(7);
  const random = () => {
    draws++;
    return next();
  };
  const buffers = new Buffers(new StandInContext(() => 0), random);
  const room = buffers.room({ decay: 0.9, preDelay: 0.02, taps: 8, dense: 0.08, decays: [1, 1, 0.5] });
  assert.deepEqual([room.numberOfChannels, room.length], [2, 44160]);
  const energy = room.getChannelData(0).reduce((sum, sample) => sum + sample * sample, 0);
  near(energy, 1, 'energy 1 a side', 1e-3);
  assert.equal(draws, 2, 'a seed a side');
  assert.equal(
    buffers.room({ decay: 0.9, preDelay: 0.02, taps: 8, dense: 0.08, decays: [1, 1, 0.5] }),
    room,
    'made once',
  );
  assert.equal(draws, 2, 'no draw for the same design');
  const longer = buffers.room({ decay: 2, preDelay: 0.02, taps: 8, dense: 0.08, decays: [1, 1, 0.5] });
  assert.notEqual(longer, room);
  assert.equal(longer.length, 96960);
  assert.equal(draws, 4);
});

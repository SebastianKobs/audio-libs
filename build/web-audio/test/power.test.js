// The audio's power (mockup/src/libs/build/web-audio/power.ts): an output and its audio context, made as the audio starts.
// Pause: the output faded out, the audio context suspended once it's quiet.
// Resume: faded in again, never at full volume: from where the fade got to if the context
// hadn't stopped yet, else from silence, the context resumed.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPower } from '../index.ts';

// An output that records its fades, and a context that can be suspended.
function standIns() {
  const fades = [];
  const output = {
    fadeOut: () => fades.push('out'),
    fadeIn: ({ fromSilence = false } = {}) => fades.push(fromSilence ? 'in from silence' : 'in'),
  };
  const context = {
    state: 'running',
    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    },
    resume() {
      this.state = 'running';
      return Promise.resolve();
    },
  };
  const power = new AudioPower({ output, context });
  return { power, fades, context };
}

test('paused: the output faded out, the context suspended once it has; resumed before that, faded back in from where it got to', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { power, fades, context } = standIns();
    power.pause();
    assert.deepEqual(fades, ['out']);
    mock.timers.tick(399);
    assert.equal(context.state, 'running', 'still fading');
    power.resume();
    assert.deepEqual(fades, ['out', 'in'], 'back before it stopped: from where the fade got to');
    mock.timers.tick(10);
    assert.equal(context.state, 'running', 'it never stops');
  } finally {
    mock.timers.reset();
  }
});

test('paused long enough, the context suspended; resumed, faded in from silence and the context resumed', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { power, fades, context } = standIns();
    power.pause();
    mock.timers.tick(400);
    assert.equal(context.state, 'suspended');
    power.pause();
    assert.deepEqual(fades, ['out'], 'not running: nothing to pause');
    power.resume();
    assert.deepEqual(fades, ['out', 'in from silence']);
    assert.equal(context.state, 'running');
    power.resume();
    assert.deepEqual(fades, ['out', 'in from silence'], 'running: nothing more');
  } finally {
    mock.timers.reset();
  }
});

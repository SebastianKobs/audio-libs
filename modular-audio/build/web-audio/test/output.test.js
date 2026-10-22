// The output after what's built (mockup/src/libs/modular-audio/build/web-audio/output.ts), on the stand-in for Web Audio: a gain of its own into where
// the sound goes, from silence, faded in, never at full volume; faded out to pause, in again from where the fade got to, or from silence
// once the audio was off
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into } from './audio-stand-in.js';
import { FADE_IN, FADE_OUT, Output } from '../index.ts';

test('the output after what is built: from silence, faded in, never at full volume; out to pause, in again from where it got to, or from silence', () => {
  let now = 4;
  const context = new StandInContext(() => now);
  const output = new Output(context);
  assert.deepEqual(into(context, context.destination), [output.node], 'into where the sound goes');
  assert.deepEqual(
    output.node.gain.events,
    [
      ['value', 0],
      ['target', 1, 4, FADE_IN],
    ],
    'from silence, faded in',
  );
  now = 6;
  output.fadeOut();
  assert.deepEqual(output.node.gain.events.at(-1), ['target', 0, 6, FADE_OUT], 'out, quickly');
  now = 7;
  output.fadeIn();
  assert.deepEqual(output.node.gain.events.at(-1), ['target', 1, 7, FADE_IN], 'in again, from where the fade got to');
  now = 9;
  output.fadeIn({ fromSilence: true });
  assert.deepEqual(
    output.node.gain.events.slice(-3),
    [
      ['cancel', 9],
      ['set', 0, 9],
      ['target', 1, 9, FADE_IN],
    ],
    'the audio was off: from silence',
  );
  assert.ok(FADE_IN >= 0.1 && FADE_OUT < FADE_IN, 'in slowly, out quickly');
});
// Firefox skips a glide on a gain nothing has gone through yet: the first sound to come came at
// full volume. A silent source into it from the start keeps it fading (LAY11b, measured in Firefox).
test('the output kept awake: a silent source into it from the start, so its fade in holds however late the first sound comes', () => {
  const context = new StandInContext(() => 4);
  const output = new Output(context);
  const awake = into(context, output.node).filter((node) => node.kind === 'constant');
  assert.equal(awake.length, 1, 'a constant source into it');
  assert.equal(awake[0].offset.v, 0, 'silent');
  assert.deepEqual(awake[0].starts, [[]], 'started at once');
});

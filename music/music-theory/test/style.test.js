// A play style (music/music-theory/style.ts): its contours and its rhythms, and the style as it plays.
// Its rhythms here plain objects of the test's own: a style is generic over a rhythm's type.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayingStyle } from '../index.ts';

test('the style as it plays: its lists as handed in to begin with, set a list at a time and kept as set, frozen; reset brings the first back', () => {
  const contours = [
    [0, 2, 1],
    [0, -1],
  ];
  const rhythms = [
    { name: 'stream', bars: 1 },
    { name: 'call', bars: 2 },
  ];
  const asHandedIn = JSON.stringify({ contours, rhythms }); // what nothing may write
  const playing = new PlayingStyle({ contours, rhythms });
  const mine = { name: 'mine', bars: 1 };
  assert.deepEqual(playing.current(), { contours, rhythms });
  playing.set({ rhythms: [rhythms[0], mine] });
  mine.bars = 2; // changed after it's handed in
  const style = playing.current();
  assert.deepEqual(
    style.rhythms.map((r) => [r.name, r.bars]),
    [
      ['stream', 1],
      ['mine', 1],
    ],
    'kept as set',
  );
  assert.deepEqual(style.contours, contours, "what isn't set stays");
  assert.throws(
    () => {
      style.rhythms[1].bars = 3;
    },
    TypeError,
    "a rhythm as it plays can't be written",
  );
  style.rhythms.length = 0;
  assert.equal(playing.current().rhythms.length, 2, 'its lists handed out as copies');
  playing.reset();
  assert.deepEqual(playing.current(), { contours, rhythms });
  assert.equal(JSON.stringify({ contours, rhythms }), asHandedIn);
});

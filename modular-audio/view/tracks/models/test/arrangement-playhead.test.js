// modular-audio/view/tracks/models/arrangement/playhead.ts: where a click in the ruler puts the
// playhead, as Arrangement.press() places it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY } from '../../../../../sequencing/clock/index.ts';
import { arrangementOf } from './arrangement.js';

test("where a click in the ruler puts the playhead: on the nearest beat; at or past the present, or a beat's rounding onto it, none, back on the present; never before the earliest, its first beat after", () => {
  // 2000 s in, so the earliest kept is where the 30 minutes start: 200 s, the 16th 800, a beat on 4 16ths
  const onBeat = arrangedAt(2000);
  assert.deepEqual(
    [7970.9, 7973.9, 7998.1, 8001, -3].map((place) => onBeat.pressAt(place)),
    [7972, 7972, null, null, 4 * (2000 - HISTORY)],
  );
  // the earliest between two beats: 200.125 s, the 16th 800.5
  const between = arrangedAt(2000.125);
  assert.deepEqual([between.pressAt(10)], [804]);
});

// an arrangement at a time, in seconds, its frame taken; pressAt(place) the playhead a press there gives
function arrangedAt(seconds) {
  const { arrangement, clock } = arrangementOf();
  clock.t = seconds;
  arrangement.frame(64);
  return {
    pressAt(place) {
      arrangement.press(place);
      const placed = arrangement.playhead;
      arrangement.release();
      return placed;
    },
  };
}

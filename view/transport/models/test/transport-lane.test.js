// The transport's lane as a model (libs/view/transport/models/transport-lane.ts):
// whether the music plays, and where it is,
// bar and beat, counted from bar 1 as the arrangement's ruler numbers them; the playhead's place while it's set back
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TransportLane } from '../index.ts';

// a clock of the test's own: its time now, its grid's place for a time (a 16th a second), its meter
function clockAt(now, meter = [4, 4]) {
  return { now: () => now, grid: { straightAt: (t) => t, meter: () => meter } };
}

test('where the music is, bar and beat, from bar 1; before the first 16th, at the start', () => {
  const lane = (now, meter) =>
    new TransportLane({ transport: { playing: false }, clock: clockAt(now, meter), playhead: () => null });
  assert.equal(lane(0).position(), '1.1');
  assert.equal(lane(5.5).position(), '1.2', "the 6th 16th: bar 1's second beat");
  assert.equal(lane(17).position(), '2.1');
  assert.equal(lane(-3).position(), '1.1', 'before the grid runs');
  assert.equal(lane(6, [3, 8]).position(), '2.1', 'in 3/8, a bar six 16ths');
});

test("the playhead's place while it's set back; whether the transport plays, read live", () => {
  const transport = { playing: false };
  let playhead = 33;
  const lane = new TransportLane({ transport, clock: clockAt(0), playhead: () => playhead });
  assert.equal(lane.position(), '3.1');
  playhead = null;
  assert.equal(lane.position(), '1.1', 'back to where the music is');
  assert.equal(lane.playing, false);
  transport.playing = true;
  assert.equal(lane.playing, true);
});

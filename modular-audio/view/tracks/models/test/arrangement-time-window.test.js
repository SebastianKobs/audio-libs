// modular-audio/view/tracks/models/arrangement/time-window.ts: the time in view, in 16ths, as
// Arrangement.frame() and scrollBy() move it: following the present or the playhead, or scrolled back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY } from '../../../../../sequencing/clock/index.ts';
import { arrangementOf } from './arrangement.js';

const SPAN = 64; // 16ths: four bars wide
const PRESENT = 100; // 16th: the clock's step in most tests, 25 s in

test('the time in view follows the present, a bar from the right edge', () => {
  const { arrangement, clock } = arrangementOf();
  clock.step(PRESENT);
  arrangement.frame(SPAN);
  assert.deepEqual([arrangement.left, arrangement.right, arrangement.following], [52, 116, true]);
});

test('scrolled back it stops following, holding where it was as time goes on, until it is scrolled back to the present; never before the earliest', () => {
  const { arrangement, clock } = arrangementOf();
  clock.step(PRESENT);
  arrangement.frame(SPAN);
  arrangement.scrollBy(16); // a bar back
  assert.deepEqual([arrangement.right, arrangement.following], [100, false]);
  clock.step(PRESENT + 4);
  arrangement.frame(SPAN);
  assert.equal(arrangement.right, 100, 'held as time goes on');
  arrangement.scrollBy(-40);
  assert.deepEqual(
    [arrangement.right, arrangement.following],
    [120, true],
    'back at the present: following again, no further',
  );
  const late = arrangementOf();
  late.clock.step(8000); // 2000 s in: the first 200 s have left the 30 minutes kept
  late.arrangement.frame(SPAN);
  late.arrangement.scrollBy(100000);
  assert.equal(late.arrangement.left, (2000 - HISTORY) * 4, 'the left edge no earlier than the earliest kept');
});

test('a young recording shows from its start at the left edge, the present moving right, until it is a bar from the right edge', () => {
  const { arrangement, clock } = arrangementOf();
  clock.step(10);
  arrangement.frame(SPAN);
  assert.deepEqual([arrangement.left, arrangement.following], [0, true], 'bar 1 at the left edge');
  clock.step(60);
  arrangement.frame(SPAN);
  assert.equal(arrangement.left, 12, 'then following, the present a bar from the right edge');
});

// the playhead played back follows as the present does: it jumped a bar from the right edge as playback started, and, scrolled back
// first, wasn't followed at all, running off the view
test('a head that starts in view, the playhead played back from where it was set: the view stays, the head running across it, then followed a bar from the right edge, as the present is; the view never going back by itself', () => {
  const { arrangement, clock, transport } = arrangementOf();
  clock.step(PRESENT);
  arrangement.frame(SPAN);
  playBackFrom(transport, 70); // set back to a place in view
  arrangement.frame(SPAN);
  assert.deepEqual([arrangement.right, arrangement.following], [116, true], 'no jump where it starts');
  playBackFrom(transport, 90);
  arrangement.frame(SPAN);
  assert.equal(arrangement.right, 116, 'running across the view');
  playBackFrom(transport, 105);
  arrangement.frame(SPAN);
  assert.equal(arrangement.right, 121, 'then followed, a bar from the right edge');
});

test('scrolled back, a head that starts is followed again; one out of view brought a bar from the right edge', () => {
  const { arrangement, clock, transport } = arrangementOf();
  clock.step(8000); // far enough on that the earliest kept leaves room below the heads
  arrangement.frame(SPAN);
  arrangement.scrollBy(40);
  assert.deepEqual([arrangement.right, arrangement.following], [7976, false], 'scrolled back');
  playBackFrom(transport, 7940);
  arrangement.frame(SPAN);
  assert.deepEqual([arrangement.right, arrangement.following], [7976, true], 'followed again, where it is');
  playBackFrom(transport, 7970);
  arrangement.frame(SPAN);
  assert.equal(arrangement.right, 7986, 'and scrolled with');
  Object.assign(transport, { playingBack: false });
  arrangement.frame(SPAN); // the playback ends: the present is followed
  playBackFrom(transport, 5000);
  arrangement.frame(SPAN);
  assert.equal(arrangement.right, 5016, 'out of view: brought a bar from the right edge');
});

// the transport's playhead at a place, in 16ths, as the clock's fixture counts them: a quarter second each
function playBackFrom(transport, place) {
  Object.assign(transport, { playingBack: true, playhead: () => place / 4 });
}

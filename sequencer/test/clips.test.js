// The sequencer's clip player (G0.1a, mockup/architecture/done.md), as Ableton's session view plays a launched clip: a pattern looping on a
// track, its notes sent into the sequencer's input as they come due, each with its note on and its note off together, a fresh index each;
// straight under the swing or on it; its velocity read as each note comes due, none leaving it out; one clip a track
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClipPlayer } from '../clips.ts';
import { STEP } from '../index.ts';

const SIXTEENTH = 0.2;
const SWING = 0.05; // every odd 16th this much late
// a grid of 0.2 s 16ths from 0, its odd ones swung late, in 4/4
const grid = {
  meter: () => [4, 4],
  stepDuration: () => SIXTEENTH,
  swingAt: (i) => (i % 2 ? SWING : 0),
  timeAt: (place) => {
    const i = Math.floor(place);
    return i * SIXTEENTH + (i % 2 ? SWING : 0) + (place - i) * SIXTEENTH;
  },
};
// an input that keeps what's sent
function input() {
  const sent = [];
  return { sent, send: (to, messages) => sent.push({ to, messages }), onNote: () => () => {} };
}
const to = (track) => ({ track, clip: { kind: track }, live: false });
// a one-bar clip: a note on the one, a 16th long, and one on the second 16th, an 8th long
const pattern = {
  bars: 1,
  loop: true,
  notes: [
    { start: 0, duration: STEP, pitch: 40 },
    { start: STEP, duration: 2 * STEP, pitch: 38 },
  ],
};

test('a launched clip sends each note as it comes due, its note on and its note off together, a fresh index each, round its loop', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  clips.launch({ to: to('drums'), pattern });
  clips.step(0, 0);
  clips.step(1, SIXTEENTH + SWING);
  clips.step(2, 2 * SIXTEENTH);
  clips.step(16, 16 * SIXTEENTH); // the next bar, round the loop
  assert.deepEqual(
    into.sent.map(({ to: where, messages }) => [where.track, ...messages.map((m) => [m.type, m.index, m.pitch, m.t])]),
    [
      ['drums', ['note on', 0, 40, 0], ['note off', 0, undefined, SIXTEENTH]],
      ['drums', ['note on', 1, 38, SIXTEENTH + SWING], ['note off', 1, undefined, SIXTEENTH + SWING + 2 * SIXTEENTH]],
      ['drums', ['note on', 2, 40, 16 * SIXTEENTH], ['note off', 2, undefined, 17 * SIXTEENTH]],
    ],
    'on the swing, its length on the straight grid',
  );
});

test("a straight clip plays under the swing: a swung 16th's note at its straight time", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  clips.launch({ to: to('bass'), pattern, straight: true });
  clips.step(1, SIXTEENTH + SWING);
  assert.equal(into.sent[0].messages[0].t, SIXTEENTH, 'its swing taken back');
});

test("a clip's velocity is read as each note comes due; none leaves the note out", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  let level = 0.5;
  clips.launch({ to: to('bass'), pattern, velocity: () => level });
  clips.step(0, 0);
  level = 0;
  clips.step(1, SIXTEENTH + SWING);
  level = 1;
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(
    into.sent.map(({ messages }) => messages[0].velocity),
    [0.5, 1],
    'at half, left out, then full',
  );
});

test('one clip a track: a launch replaces what it played, stop() ends it; each track its own, in the order launched', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  clips.launch({ to: to('drums'), pattern });
  clips.launch({ to: to('bass'), pattern, straight: true });
  clips.launch({ to: to('drums'), pattern: { bars: 1, loop: true, notes: [{ start: 0, duration: STEP, pitch: 50 }] } });
  clips.step(0, 0);
  assert.deepEqual(
    into.sent.map(({ to: where, messages }) => [where.track, messages[0].pitch]),
    [
      ['drums', 50],
      ['bass', 40],
    ],
    'the drums its new clip, first as launched first',
  );
  clips.stop('drums');
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(
    into.sent.slice(2).map(({ to: where }) => where.track),
    ['bass'],
    'the drums stopped',
  );
});

test("a launched clip's notes carry its launch's region, the clip player's own; launched again in its place, a new one (G1a)", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  clips.launch({ to: to('drums'), pattern });
  clips.step(0, 0);
  clips.step(1, SIXTEENTH + SWING);
  clips.launch({ to: to('drums'), pattern });
  clips.step(16, 16 * SIXTEENTH);
  const [first, second, again] = into.sent.map(({ to: address }) => address.play?.region);
  assert.equal(first, second, 'one launch, one region');
  assert.ok(Number.isInteger(first) && again !== first, 'launched again, another');
});

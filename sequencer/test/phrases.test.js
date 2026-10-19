// Phrases of events sent as each 16th comes (mockup/src/libs/sequencer/phrases.ts): a phrase kept by its places on the grid, so a hold or Stop pauses it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Phrases } from '../index.ts';
import { STEP } from '../../clock/index.ts';

// a stand-in for where phrases are sent: what each send carries, the phrase's region with it
function sentWith() {
  const sent = [];
  let regions = 0;
  const region = () => ++regions;
  const send = (to, events, at) => sent.push({ to, pitches: events.map(({ note }) => note.pitch), region: at });
  return { sent, region, send };
}
// a phrase's event at a place, its pitch the place's 16th, worked out as it comes due, counted
function noteAt(start, worked) {
  return {
    start,
    event: () => {
      worked.push(start);
      return { note: { pitch: start / STEP, t: start, velocity: 1 }, duration: 0.1 };
    },
  };
}
const flower = { kind: 'tap' };
const to = { track: 'replay tap/1', clip: flower };

test("a phrase's notes sent as their 16th comes, not all at once: those in one 16th in one send, each worked out then, the phrase one region", () => {
  const { sent, region, send } = sentWith();
  const phrases = new Phrases({ region, send, grid: { nextStepNumber: 0 } });
  const worked = [];
  phrases.play(
    to,
    [0, 1, 1.5, 4].map((sixteenth) => noteAt(sixteenth * STEP, worked)),
  );
  assert.deepEqual(sent, [], 'nothing before its 16th');
  phrases.step(0);
  phrases.step(1);
  assert.deepEqual(worked, [0, STEP, 1.5 * STEP], 'each worked out as it comes due');
  phrases.step(2);
  phrases.step(3);
  phrases.step(4);
  assert.deepEqual(
    sent.map(({ pitches, region }) => [pitches, region]),
    [
      [[0], 1],
      [[1, 1.5], 1],
      [[4], 1],
    ],
  );
  phrases.step(5);
  assert.equal(sent.length, 3, 'played out');
});

test('held, a phrase waits: no 16th, nothing sent; going on, the rest as the 16ths come. A 16th skipped as the ticks lag left out, as the grid skips it', () => {
  const { sent, region, send } = sentWith();
  const phrases = new Phrases({ region, send, grid: { nextStepNumber: 0 } });
  phrases.play(
    to,
    [8, 9, 12].map((sixteenth) => noteAt(sixteenth * STEP, [])),
  );
  phrases.step(8); // then held: no 16th for as long as it holds
  assert.deepEqual(
    sent.map(({ pitches }) => pitches),
    [[8]],
  );
  phrases.step(10); // the ticks lagged: the 9th skipped
  phrases.step(12);
  assert.deepEqual(
    sent.map(({ pitches }) => pitches),
    [[8], [12]],
  );
});

test('a plant deleted, or the garden cleared: its phrase sends nothing more', () => {
  const { sent, region, send } = sentWith();
  const phrases = new Phrases({ region, send, grid: { nextStepNumber: 0 } });
  const vine = { kind: 'vine' };
  phrases.play(to, [noteAt(0, []), noteAt(STEP, [])]);
  phrases.play({ track: 'replay vine/1', clip: vine }, [noteAt(STEP, [])]);
  phrases.step(0);
  phrases.forget(flower);
  phrases.step(1);
  assert.deepEqual(
    sent.map(({ to: { clip } }) => clip),
    [flower, vine],
    "the flower's second note not sent, the vine's",
  );
  phrases.play(to, [noteAt(2 * STEP, [])]);
  phrases.clear();
  phrases.step(2);
  assert.equal(sent.length, 2, 'cleared');
});

// a visitor sings from a frame, on the next 16th, which the grid may have handed out already, within its lookahead
test("a phrase begun on a 16th the grid has handed out already: its notes there sent at once, the rest as their 16ths come; whether a clip's phrase still has notes to send", () => {
  const { sent, region, send } = sentWith();
  const grid = { nextStepNumber: 5 };
  const phrases = new Phrases({ region, send, grid });
  const visitor = { kind: 'visitor' };
  phrases.play(
    { track: 'replay visitor/1', clip: visitor },
    [4, 6].map((sixteenth) => noteAt(sixteenth * STEP, [])),
  );
  assert.deepEqual(
    sent.map(({ pitches }) => pitches),
    [[4]],
    'the 16th handed out already: at once',
  );
  assert.equal(phrases.playing(visitor), true, 'its next note to come');
  phrases.step(5);
  phrases.step(6);
  assert.deepEqual(
    sent.map(({ pitches, region }) => [pitches, region]),
    [
      [[4], 1],
      [[6], 1],
    ],
    'the phrase one region',
  );
  assert.equal(phrases.playing(visitor), false, 'played out');
});

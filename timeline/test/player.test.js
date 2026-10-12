// The timeline's player (mockup/src/libs/timeline/; mockup/architecture/tests.md), on events of their own, not notes: a hand's presses
// played back, each its start, its pressure's points and its release, as a performer is told them; a pointer's tilt, events that hold
// until the next of theirs, each told as it comes due, the one in effect where playback starts picked up from there
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../index.ts';

// a performer that keeps what it's told: each press's start, at the clock time it's heard and its own time it starts from; a point; an
// end; an event that holds, as it comes due, or picked up where playback starts, from there
function performer() {
  const heard = [];
  return {
    heard,
    start: (press, t, at) => heard.push(['start', press.finger, t, at]),
    point: (press, point, t) => heard.push(['point', press.finger, point.value, t]),
    end: (press, t) => heard.push(['end', press.finger, t]),
    hold: (tilt, t, from) => heard.push(['hold', tilt.value, t, from]),
  };
}
const pointsOf = (press) => press.pressure ?? [];
// a hold from 2 s to 5 s taken out: the timeline stands while it lasts
const HELD = Object.freeze({
  toTimeline: (t) => (t <= 2 ? t : Math.max(2, t - 3)),
  fromTimeline: (along) => (along <= 2 ? along : along + 3),
});

test('events played back from a time, each moment as it comes due on a tick, heard as far after where it starts as it lies along the timeline; at one time a start before its points, an end after', () => {
  const performing = performer();
  const player = new Player({ performer: performing, pointsOf });
  const events = [
    { t: 1, finger: 0, duration: 2, pressure: [{ t: 2, value: 0.5 }] },
    { t: 2, finger: 1, duration: 1 },
    { t: 3, finger: 2, duration: 1 },
  ];
  player.play({ events }, { from: 0, at: 10, end: 5 });
  player.due(11.5);
  assert.deepEqual(performing.heard, [['start', 0, 11, 1]], 'only what was due');
  player.due(20);
  assert.deepEqual(performing.heard, [
    ['start', 0, 11, 1],
    ['start', 1, 12, 2],
    ['point', 0, 0.5, 12],
    ['start', 2, 13, 3],
    ['end', 0, 13],
    ['end', 1, 13],
    ['end', 2, 14],
  ]);
});

test('an event under way where it starts chased, started at once from there, its points before passed over; one over by then, or starting at or past the end, left out; an open one never ended', () => {
  const performing = performer();
  const player = new Player({ performer: performing, pointsOf });
  const pressure = [
    { t: 1.5, value: 0.2 },
    { t: 3, value: 0.8 },
  ];
  const events = [
    { t: 0, finger: 0, duration: 1 },
    { t: 1, finger: 1, duration: 3, pressure },
    { t: 6, finger: 2, duration: 1 },
    { t: 2, finger: 3 },
  ];
  player.play({ events }, { from: 2, at: 0, end: 5 });
  player.due(100);
  assert.deepEqual(performing.heard, [
    ['start', 1, 0, 2],
    ['start', 3, 0, 2],
    ['point', 1, 0.8, 1],
    ['end', 1, 2],
  ]);
});

test('in timeline time: a hold taken out played past at once; where it plays at a time, past a hold at once, never past the end; when it plays to the end, and whether it has', () => {
  const performing = performer();
  const player = new Player({ performer: performing, timeline: HELD });
  assert.equal(player.position(0), null, 'none before it plays');
  assert.equal(player.endsAt(), null);
  const events = [
    { t: 1, finger: 0, duration: 0.5 },
    { t: 6, finger: 1, duration: 1 },
  ];
  player.play({ events }, { from: 0, at: 100, end: 10 });
  player.due(200);
  assert.deepEqual(performing.heard, [
    ['start', 0, 101, 1],
    ['end', 0, 101.5],
    ['start', 1, 103, 6],
    ['end', 1, 104],
  ]);
  assert.equal(player.position(102.5), 5.5, 'past the hold at once');
  assert.equal(player.position(200), 10, 'never past the end');
  assert.equal(player.endsAt(), 107);
  assert.equal(player.ended(106.9), false);
  assert.equal(player.ended(107), true);
});

test("an event's end in timeline time as endOf() says; by default where it ended, along the timeline, never before it starts", () => {
  const press = { t: 1, finger: 0, duration: 2 };
  const asEnded = performer();
  const ended = new Player({ performer: asEnded, timeline: HELD });
  ended.play({ events: [press] }, { from: 0, at: 0, end: 10 });
  ended.due(100);
  assert.deepEqual(asEnded.heard.at(-1), ['end', 0, 2], 'where its release came, the hold taken out');
  const whole = performer();
  const kept = new Player({
    performer: whole,
    timeline: HELD,
    endOf: (event, toTimeline) => toTimeline(event.t) + event.duration,
  });
  kept.play({ events: [press] }, { from: 0, at: 0, end: 10 });
  kept.due(100);
  assert.deepEqual(whole.heard.at(-1), ['end', 0, 3], 'its length kept whole across the hold');
  const early = performer();
  const never = new Player({ performer: early });
  never.play({ events: [{ t: 2, finger: 4, duration: -1 }] }, { from: 0, at: 0, end: 10 });
  never.due(100);
  assert.deepEqual(early.heard, [
    ['start', 4, 2, 2],
    ['end', 4, 2],
  ]);
});

test('stopped: what is under way ended then, nothing more told, no place; played to the end: each under way rings out to its end, as far after it was heard from as it lies along the timeline, an open one ended then', () => {
  const stopping = performer();
  const stopped = new Player({ performer: stopping });
  const events = [
    { t: 0, finger: 0, duration: 10 },
    { t: 0.5, finger: 1 },
  ];
  stopped.play({ events }, { from: 0, at: 0, end: 20 });
  stopped.due(1);
  stopped.stop(1);
  stopped.due(100);
  assert.deepEqual(stopping.heard, [
    ['start', 0, 0, 0],
    ['start', 1, 0.5, 0.5],
    ['end', 0, 1],
    ['end', 1, 1],
  ]);
  assert.equal(stopped.position(5), null);
  const finishing = performer();
  const finished = new Player({ performer: finishing });
  const ringing = [
    { t: 0, finger: 0, duration: 4 },
    { t: 1, finger: 1 },
    { t: 2, finger: 2, duration: 1 },
  ];
  finished.play({ events: ringing }, { from: 0, at: 10, end: 3 });
  finished.due(12.5);
  finished.finish(13);
  finished.due(100);
  assert.deepEqual(finishing.heard.slice(3), [
    ['end', 0, 14],
    ['end', 1, 13],
    ['end', 2, 13],
  ]);
});

test('events that hold: the one in effect where it starts picked up at once, from there; each after it until the end as it comes due; at one time before what starts there; never ended, stopped or finished', () => {
  const performing = performer();
  const player = new Player({ performer: performing });
  const tilt = [
    { t: 0, value: 0 },
    { t: 2, value: 1 },
    { t: 4, value: 0.5 },
    { t: 9, value: 0 },
  ];
  const lean = [{ t: 5, value: 7 }];
  player.play({ events: [{ t: 5, finger: 0, duration: 2 }], held: [tilt, lean] }, { from: 3, at: 100, end: 6 });
  player.due(200);
  assert.deepEqual(performing.heard, [
    ['hold', 1, 100, 3],
    ['hold', 0.5, 101, undefined],
    ['hold', 7, 102, undefined],
    ['start', 0, 102, 5],
  ]);
  player.stop(103);
  player.finish(104);
  assert.deepEqual(performing.heard.slice(4), [['end', 0, 103]], 'only what was under way ended, none that holds');
});

test('an event that holds right where playback starts picked up from there; in timeline time, a hold played past', () => {
  const performing = performer();
  const player = new Player({ performer: performing, timeline: HELD });
  const held = [
    [
      { t: 1, value: 1 },
      { t: 6, value: 2 },
      { t: 8, value: 3 },
    ],
  ];
  player.play({ events: [], held }, { from: 1, at: 0, end: 10 });
  player.due(3.5);
  assert.deepEqual(
    performing.heard,
    [
      ['hold', 1, 0, 1],
      ['hold', 2, 2, undefined],
    ],
    'the one after the hold two seconds on along the timeline, not five',
  );
});

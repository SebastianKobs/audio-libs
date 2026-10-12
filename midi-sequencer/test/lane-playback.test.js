// The lanes played back (P4b, mockup/architecture/done.md): each track's controllers as they were recorded, from the playhead, each point
// at its time in song time, to the lane's track, marked played back; picked up where playback starts, as a sounding note is chased; a lane
// moved by hand while it plays back passed over; and the strips back as they were when it started, but one moved by hand
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecordingPlayer } from '../index.ts';

// a player, the tool naming a lane's track as the studio names it: a replay track's by its kind and number, a strip's by its name; and
// what it sends, each controller with where it went
function playerWith({ skip } = {}) {
  const sent = [];
  const player = new RecordingPlayer({
    input: { send: (to, messages) => sent.push(...messages.map((message) => ({ to, ...message }))) },
    trackOf: () => null,
    trackOfLane: (lane) => (lane.track === null ? lane.kind : `replay ${lane.kind} ${lane.track + 1}`),
    ...(skip ? { skip } : {}),
  });
  return { sent, player };
}
const near = (got, want) => Math.abs(got - want) < 1e-9;
// a replay track's level, jumping, then gliding up, then jumping down; and the master's volume, set, then gliding down
const lanes = [
  {
    kind: 'tap',
    track: 0,
    controller: 'volume',
    points: [
      { t: 1, value: 0.5 },
      { t: 4, value: 0.8, glide: 0.1 },
      { t: 6, value: 0.2 },
    ],
  },
  {
    kind: 'master',
    track: null,
    controller: 'volume',
    points: [
      { t: 2, value: 1 },
      { t: 3.5, value: 0.5, glide: 1 },
    ],
  },
];

test("a track's lanes played back from a time: picked up there at their values then, a glide where it had got to; each point after at its time, a glide with its time constant, to the lane's track, marked played back", () => {
  const { sent, player } = playerWith();
  player.play([], lanes, { from: 4.05, at: 100, end: 20 }); // recording time 4.05 at clock time 100
  player.due(110);
  const [tapAt, masterAt, tapLater] = sent;
  assert.equal(tapAt.to.track, 'replay tap 1');
  assert.ok(
    near(tapAt.value, 0.8 + (0.5 - 0.8) * Math.exp(-0.05 / 0.1)) && tapAt.t === 100,
    'gliding up, where it had got to',
  );
  assert.equal(tapAt.glide, undefined, 'set there at once');
  assert.equal(masterAt.to.track, 'master', "a strip's by its name");
  assert.ok(near(masterAt.value, 0.5 + 0.5 * Math.exp(-0.55)), 'gliding down, where it had got to');
  assert.deepEqual(
    [tapLater.to.track, tapLater.value, tapLater.controller],
    ['replay tap 1', 0.2, 'volume'],
    'its point after, at its time',
  );
  assert.ok(near(tapLater.t, 101.95));
  assert.equal(sent.length, 3);
  assert.deepEqual(
    [tapAt.to.source, tapAt.to.play.playback, tapAt.type],
    ['playback', true, 'controller'],
    'its own sender, marked played back',
  );
});

test('a lane moved by hand while it plays back: nothing more of it sent, nor put back after', () => {
  const moved = new Set();
  const { sent, player } = playerWith({ skip: (track, controller) => moved.has(`${track} ${controller}`) });
  player.play([], lanes, { from: 4.05, at: 100, end: 20 });
  player.due(100.5);
  moved.add('replay tap 1 volume'); // its fader moved by hand
  player.due(110);
  player.leave(111);
  assert.deepEqual(
    sent.filter(({ to }) => to.track === 'replay tap 1').map(({ t }) => t),
    [100],
    'picked up, then passed over: its point at 6 not sent, nor its value put back',
  );
});

test('back as they were when it started: each lane it played set to its value at the end of what was recorded before, at a time', () => {
  const { sent, player } = playerWith();
  player.play([], lanes, { from: 1.5, at: 100, end: 5 });
  player.due(110);
  sent.length = 0;
  player.leave(104);
  assert.deepEqual(
    sent.map(({ to, value, t }) => [to.track, +value.toFixed(9), t]),
    [
      ['replay tap 1', +(0.8 + (0.5 - 0.8) * Math.exp(-1 / 0.1)).toFixed(9), 104],
      ['master', +(0.5 + 0.5 * Math.exp(-1.5)).toFixed(9), 104],
    ],
  );
  player.leave(105);
  assert.equal(sent.length, 2, 'put back once');
});

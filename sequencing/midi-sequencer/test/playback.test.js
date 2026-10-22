// The region player (P3a, mockup/architecture/done.md): the recording's regions played back from a time, each note sent as it was heard,
// offset to now, once it comes due, to the track the tool names for it, marked played back, its senders kept apart at the input
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecordingPlayer } from '../index.ts';

const flower = { kind: 'tap' };
// a region of a flower's on replay tap 1, its notes as the recorder keeps them, its track's name as its plays were sent
const region = (notes, more = {}) => ({
  owner: flower,
  clip: flower,
  kind: 'tap',
  role: 'tap',
  live: false,
  track: 0,
  trackName: 'replay tap 1',
  notes,
  from: notes[0].t,
  to: 99,
  ...more,
});
// a player, and what it sends
function playerWith() {
  const sent = [];
  const player = new RecordingPlayer({ input: { send: (to, messages) => sent.push({ to, messages }) } });
  return { sent, player };
}
const messagesOf = (sent, type) => sent.flatMap(({ messages }) => messages).filter((message) => message.type === type);

test('from a time, each note as it was heard, offset to now, sent once it comes due: its note on with its velocity; its note off once that comes due; a note over before the time not sent (P3a)', () => {
  const { sent, player } = playerWith();
  player.play(
    [
      region([
        { t: 1, pitch: 60, velocity: 0.8, duration: 0.5 },
        { t: 10, pitch: 62, velocity: 0.6, duration: 0.25 },
        { t: 10.5, pitch: 64, velocity: 0.7, duration: 1 },
      ]),
    ],
    [],
    { from: 10, at: 100, end: 20 },
  ); // recording time 10 at clock time 100
  player.due(100.2);
  assert.deepEqual(
    messagesOf(sent, 'note on').map(({ pitch, velocity, t }) => [pitch, velocity, t]),
    [[62, 0.6, 100]],
    'the note at the time, on time; the one over before it not sent; the next not due yet',
  );
  assert.deepEqual(messagesOf(sent, 'note off'), [], 'its note off not due yet');
  player.due(100.6);
  assert.deepEqual(
    messagesOf(sent, 'note on').map(({ pitch, t }) => [pitch, t]),
    [
      [62, 100],
      [64, 100.5],
    ],
  );
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ t }) => t),
    [100.25],
    'its note off once due',
  );
});

test("a note's per-note controllers with its note on, its bend and vibrato depth among them; its changes after it, its pitch's glides among them, each at its time (P3a, DRY7)", () => {
  const { sent, player } = playerWith();
  player.play(
    [
      region([
        {
          t: 2,
          pitch: 60,
          velocity: 1,
          duration: 2,
          controllers: { pan: -0.5, bend: -1, 'vibrato depth': 10 },
          lanes: { volume: [{ t: 2.5, value: 0.4, glide: 0.08 }], pitch: [{ value: 62, t: 3 }] },
        },
      ]),
    ],
    [],
    { from: 2, at: 50, end: 10 },
  );
  player.due(53);
  const changes = messagesOf(sent, 'per-note controller').map(({ controller, value, t, glide }) =>
    glide === undefined ? [controller, value, t] : [controller, value, t, glide],
  );
  assert.deepEqual(changes, [
    ['pan', -0.5, 50],
    ['bend', -1, 50],
    ['vibrato depth', 10, 50],
    ['volume', 0.4, 50.5, 0.08],
    ['pitch', 62, 51],
  ]);
  const [on] = messagesOf(sent, 'note on');
  assert.ok(
    messagesOf(sent, 'per-note controller').every(({ index }) => index === on.index),
    'all by its index',
  );
});

test('a note sounding where it starts, a drone held from before, chased: started at once, for what was left of it (P3a)', () => {
  const { sent, player } = playerWith();
  player.play([region([{ t: 5, pitch: 48, velocity: 0.5, duration: 10 }])], [], { from: 10, at: 100, end: 30 });
  player.due(106);
  assert.deepEqual(
    messagesOf(sent, 'note on').map(({ pitch, t }) => [pitch, t]),
    [[48, 100]],
  );
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ t }) => t),
    [105],
  );
});

test('a note chased as it was where playback starts: at the pitch it had glided to, its per-note controllers as changed by then, its bend, a slide in, over (P3a)', () => {
  const { sent, player } = playerWith();
  player.play(
    [
      region([
        {
          t: 2,
          pitch: 60,
          velocity: 1,
          duration: 2,
          controllers: { pan: -0.5, bend: -1, 'vibrato depth': 10 },
          lanes: { volume: [{ t: 2.5, value: 0.4, glide: 0.08 }], pitch: [{ value: 62, t: 3 }] },
        },
      ]),
    ],
    [],
    { from: 3.2, at: 50, end: 10 },
  );
  player.due(51);
  assert.deepEqual(
    messagesOf(sent, 'note on').map(({ pitch, t }) => [pitch, t]),
    [[62, 50]],
  );
  assert.deepEqual(
    messagesOf(sent, 'per-note controller').map(({ controller, value, t }) => [controller, value, t]),
    [
      ['pan', -0.5, 50],
      ['vibrato depth', 10, 50],
      ['volume', 0.4, 50],
    ],
    'no glide nor change of before sent after it',
  );
});

test("stopped, what's sounding let go at once and nothing more sent; to the track it was recorded on, with its clip, as you played it or not, marked played back, its own sender (P3a)", () => {
  const { sent, player } = playerWith();
  player.play(
    [
      region([
        { t: 1, pitch: 60, velocity: 1, duration: 4 },
        { t: 3, pitch: 62, velocity: 1, duration: 1 },
      ]),
    ],
    [],
    {
      from: 1,
      at: 10,
      end: 9,
    },
  );
  player.due(10.1);
  player.stop(11);
  player.due(20);
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ t }) => t),
    [11],
    'let go as it stops',
  );
  assert.deepEqual(
    messagesOf(sent, 'note on').map(({ pitch }) => pitch),
    [60],
    'nothing more',
  );
  const [{ to }] = sent;
  assert.deepEqual(
    { track: to.track, clip: to.clip, live: to.live, source: to.source, playback: to.play.playback },
    { track: 'replay tap 1', clip: flower, live: false, source: 'playback', playback: true },
  );
});

// where it catches up with what was recorded before it started, it let go of what sounded at once, a note recorded past it cut there
// (P3b, found after it was committed)
test('played to the end: a note sounding there rings out to its recorded length, from where it was heard, chased or not; one held open in the recording let go there; nothing more sent', () => {
  const { sent, player } = playerWith();
  player.play(
    [
      region([
        { t: 9, pitch: 60, velocity: 1, duration: 4 }, // sounding where it starts, chased
        { t: 11, pitch: 62, velocity: 1 }, // held open
        { t: 11.5, pitch: 64, velocity: 1, duration: 2 },
      ]),
    ],
    [],
    { from: 10, at: 100, end: 12 },
  ); // recording time 10 at clock time 100, played to 12
  player.due(102);
  player.finish(102);
  player.due(110);
  const pitches = new Map(messagesOf(sent, 'note on').map(({ index, pitch }) => [index, pitch]));
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ index, t }) => [pitches.get(index), t]),
    [
      [60, 103],
      [62, 102],
      [64, 103.5],
    ],
    'each to its recorded end, the open one at the end',
  );
  assert.equal(messagesOf(sent, 'note on').length, 3, 'nothing more');
});

test('where it plays, a recording time, from where it started as time goes on; ended at the end of what was recorded before it started; a region on no track left out (P3a)', () => {
  const { player } = playerWith();
  assert.equal(player.position(0), null, 'not playing: nowhere');
  player.play([region([{ t: 4, pitch: 60, velocity: 1, duration: 1 }])], [], { from: 2, at: 100, end: 8 });
  assert.equal(player.position(103), 5);
  assert.equal(player.ended(105.9), false);
  assert.equal(player.ended(106), true, 'at the end of what was recorded before Play');
  const noTrack = new RecordingPlayer({ input: { send: () => assert.fail('sent') } });
  noTrack.play([region([{ t: 2, pitch: 60, velocity: 1, duration: 1 }], { trackName: undefined })], [], {
    from: 2,
    at: 0,
    end: 5,
  });
  noTrack.due(10);
});

// played in song time (P3b's fix): a hold in the recording, a stop's or an earlier playback's, played past at once, not waited out
test("played in song time, a hold in the recording taken out: a note after it comes as many seconds after one before it as were played, not as long as it held; where it plays past it; ended at the end's song time (P3b)", () => {
  // the recording held from 4 s to 10 s: song time, the clock's less the hold, standing within it
  const songTime = (t) => {
    if (t <= 4) {
      return t;
    }
    return Math.max(4, t - 6);
  };
  const timeOfSong = (song) => (song <= 4 ? song : song + 6);
  const sent = [];
  const player = new RecordingPlayer({
    input: { send: (to, messages) => sent.push(...messages) },
    song: { toTimeline: songTime, fromTimeline: timeOfSong },
  });
  player.play(
    [
      region([
        { t: 3, pitch: 60, velocity: 1, duration: 0.5 },
        { t: 11, pitch: 62, velocity: 1, duration: 0.5 },
      ]),
    ],
    [],
    {
      from: 2,
      at: 100,
      end: 12,
    },
  );
  player.due(104);
  assert.deepEqual(
    sent.filter((message) => message.type === 'note on').map(({ pitch, t }) => [pitch, t]),
    [
      [60, 101],
      [62, 103],
    ],
    'the second 5 s of song after it started, not 9',
  );
  assert.equal(player.position(103), 11, 'past the hold where it plays');
  assert.equal(player.ended(103.9), false);
  assert.equal(player.ended(104), true, "at the end's song time");
});

// a note sent with its length sounds that long whatever holds come, as the garden's ringing past a hold does: kept whole in song time,
// not cut where the hold begins; a held note's end where its note off came (P3c1, mockup/architecture/done.md)
test('played in song time, a note sent with its length rings that long across a hold in the recording, kept whole; a held note ends where it was let go', () => {
  // the recording held from 5 s to 8 s
  const songTime = (t) => {
    if (t <= 5) {
      return t;
    }
    return Math.max(5, t - 3);
  };
  const timeOfSong = (song) => (song <= 5 ? song : song + 3);
  const sent = [];
  const player = new RecordingPlayer({
    input: { send: (to, messages) => sent.push({ to, messages }) },
    song: { toTimeline: songTime, fromTimeline: timeOfSong },
  });
  player.play(
    [
      region([
        { t: 4, pitch: 60, velocity: 1, duration: 2 }, // sent with its length, ringing into the hold
        { t: 4.5, pitch: 62, velocity: 1, duration: 4.5, held: true }, // held, let go at 9, after the hold
      ]),
    ],
    [],
    { from: 3, at: 100, end: 20 },
  );
  player.due(110);
  const pitches = new Map(messagesOf(sent, 'note on').map(({ index, pitch }) => [index, pitch]));
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ index, t }) => [pitches.get(index), t]),
    [
      [60, 103],
      [62, 103],
    ],
    'its 2 s from 101, not cut at the hold; the held one where it was let go, 6 s of song',
  );
});

// a note whose recorded end came before its start, let go before it sounded: its end was sent before its start and passed over, so
// nothing ended it, the note held until playback reached the present (KNOWN_BUGS.md, 2026-10-12)
test('a note recorded as ending before it starts, let go before it sounded: started and let go at once, not held to the end', () => {
  const { sent, player } = playerWith();
  player.play([region([{ t: 5, pitch: 60, velocity: 1, duration: -0.1, held: true }])], [], {
    from: 4,
    at: 100,
    end: 20,
  });
  player.due(110);
  assert.deepEqual(
    messagesOf(sent, 'note off').map(({ t }) => t),
    [101],
    'let go as it starts',
  );
});

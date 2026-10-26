// The clip player (mockup/src/libs/sequencing/clip-player/player.ts), as Ableton's session view: tracks of clip slots, a clip launched from its
// slot, a pattern looping on its track, its notes sent into the sequencer's input as they come due, each with its note on and its note
// off together, a fresh index each; straight under the swing or on it; its velocity read as each note comes due, none leaving it out;
// one clip a track; its notes sent as pitches, transposed by its semitones as it's launched
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClipPlayer } from '../index.ts';
import { STEP } from '../../clock/index.ts';
import { SIXTEENTH, SWING, swungGrid } from '../../sequencer/test/swung-grid.js';

const grid = swungGrid; // every odd 16th SWING late
// an input that keeps what's sent
function input() {
  const sent = [];
  return { sent, send: (to, messages) => sent.push({ to, messages }), onNote: () => () => {} };
}
const to = (track) => ({ track, clip: { kind: track }, live: false });
// a clip put in a slot of its own, by its track's name, and launched from it
function launch(clips, clip, slot = clip.to.track) {
  clips.put(slot, clip);
  clips.launch(slot);
}
// a one-bar clip: a note on the one, a 16th long, and one on the second 16th, an 8th long
const pattern = {
  bars: 1,
  loop: true,
  events: [
    { start: 0, duration: STEP, pitch: 40 },
    { start: STEP, duration: 2 * STEP, pitch: 38 },
  ],
};

test('a launched clip sends each note as it comes due, its note on and its note off together, a fresh index each, round its loop', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  launch(clips, { to: to('drums'), pattern });
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
  launch(clips, { to: to('bass'), pattern, straight: true });
  clips.step(1, SIXTEENTH + SWING);
  assert.equal(into.sent[0].messages[0].t, SIXTEENTH, 'its swing taken back');
});

test("a clip's velocity is read as each note comes due; none leaves the note out", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  let level = 0.5;
  launch(clips, { to: to('bass'), pattern, velocity: () => level });
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

// which clip a track plays, in what order, and stop() the launcher's (launcher.test.js): here a launch's own address and velocity
test("one clip a track: launched again, its notes the new clip's, sent where it sends them, at its velocity; stop() ends it", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  launch(clips, { to: to('drums'), pattern });
  launch(
    clips,
    {
      to: { track: 'drums', clip: { kind: 'kit' }, live: false },
      pattern: { bars: 1, loop: true, events: [{ start: 0, duration: STEP, pitch: 50 }] },
      velocity: () => 0.5,
    },
    'kit',
  );
  clips.step(0, 0);
  assert.deepEqual(
    into.sent.map(({ to: where, messages }) => [where.track, where.clip.kind, messages[0].pitch, messages[0].velocity]),
    [['drums', 'kit', 50, 0.5]],
    "the new clip's notes, to its clip, at its velocity",
  );
  clips.stop('drums');
  clips.step(16, 16 * SIXTEENTH);
  assert.equal(into.sent.length, 1, 'stopped');
});

test("a launched clip's notes carry its launch's region, the clip player's own; launched again in its place, a new one", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  launch(clips, { to: to('drums'), pattern });
  clips.step(0, 0);
  clips.step(1, SIXTEENTH + SWING);
  clips.launch('drums');
  clips.step(16, 16 * SIXTEENTH);
  const [first, second, again] = into.sent.map(({ to: address }) => address.play?.region);
  assert.equal(first, second, 'one launch, one region');
  assert.ok(Number.isInteger(first) && again !== first, 'launched again, another');
});

test('tracks of clip slots: a clip put in its slot in place of the one it held, read by its track in the order put, launched by its slot', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  const groove = { to: to('drums'), pattern };
  const fill = { to: to('drums'), pattern: { bars: 1, loop: true, events: [{ start: 0, duration: STEP, pitch: 50 }] } };
  const line = { to: to('bass'), pattern };
  clips.put('groove', groove);
  clips.put('line', line);
  clips.put('fill', fill);
  assert.deepEqual(clips.slotsOn('drums'), ['groove', 'fill'], "a track's slots, in the order put");
  assert.deepEqual(clips.slotsOn('bass'), ['line']);
  clips.put('groove', { ...groove, straight: true });
  assert.deepEqual(clips.slotsOn('drums'), ['groove', 'fill'], 'put again: in its place');
  assert.equal(clips.clipIn('groove').straight, true, 'the clip put since');
  assert.equal(clips.clipIn('nothing'), undefined, 'an empty slot');
  clips.launch('fill');
  clips.step(0, 0);
  assert.deepEqual(
    into.sent.map(({ messages }) => messages[0].pitch),
    [50],
    "the launched slot's clip alone",
  );
});

test("a clip's notes sent as their pitches, transposed by its semitones", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  const pitches = {
    bars: 1,
    loop: true,
    events: [
      { start: 0, duration: STEP, pitch: 48 },
      { start: 2 * STEP, duration: STEP, pitch: 62 },
    ],
  };
  launch(clips, { to: to('bass'), pattern: pitches, transpose: -12 });
  clips.step(0, 0);
  clips.step(2, 2 * SIXTEENTH);
  clips.launch('bass');
  clips.step(16, 16 * SIXTEENTH);
  launch(clips, { to: to('drums'), pattern, transpose: 2 });
  clips.step(32, 32 * SIXTEENTH);
  assert.deepEqual(
    into.sent.map(({ to: where, messages }) => [where.track, messages[0].pitch]),
    [
      ['bass', 36],
      ['bass', 50],
      ['bass', 36],
      ['bass', 36],
      ['drums', 42],
    ],
    "each pitch as written, transposed by the clip's semitones, on each launch",
  );
});

test("a clip's note carries its part, its per-note values and a held note's glides, in ticks after its start, transposed with it", () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  const sung = {
    bars: 1,
    loop: true,
    events: [{ start: 0, duration: 4 * STEP, pitch: 60, part: 3, values: { vibrato: 20 }, glides: [[2 * STEP, 62]] }],
  };
  launch(clips, { to: to('reed'), pattern: sung, transpose: 12 });
  clips.step(0, 0);
  assert.deepEqual(into.sent[0].messages, [
    { type: 'note on', index: 0, pitch: 72, velocity: 1, t: 0, part: 3 },
    { type: 'per-note controller', index: 0, controller: 'vibrato', value: 20, t: 0 },
    { type: 'per-note controller', index: 0, controller: 'pitch', value: 74, t: 2 * SIXTEENTH },
    { type: 'note off', index: 0, t: 4 * SIXTEENTH },
  ]);
});

test("a clip played once on a track lent as it starts, by its owner's hook, for its span; launched again from its slot, lent again", () => {
  const into = input();
  const lent = [];
  const clips = new ClipPlayer({ input: into, grid });
  const lend = (where, span) => {
    lent.push([where.track, span]);
    return {
      ...where,
      track: `my ${where.track}/${lent.length}`,
      play: { ...where.play, track: lent.length, until: span.until },
    };
  };
  const phrase = { bars: 1, events: [{ start: STEP, duration: STEP, pitch: 50 }] };
  const flower = { kind: 'tap' };
  clips.put(flower, { to: { track: 'tap', clip: flower, live: false }, pattern: phrase, once: true, lend });
  assert.deepEqual(clips.slotsOn('tap'), [flower], 'on the track it borrows from');
  clips.launch(flower);
  clips.step(2, 2 * SIXTEENTH);
  assert.deepEqual(lent, [], 'not before its beat');
  clips.step(4, 4 * SIXTEENTH);
  clips.step(5, 5 * SIXTEENTH + SWING);
  clips.launch(flower);
  clips.step(8, 8 * SIXTEENTH);
  clips.step(9, 9 * SIXTEENTH + SWING);
  assert.deepEqual(lent, [
    ['tap', { from: 5 * SIXTEENTH + SWING, until: 5 * SIXTEENTH + SWING + SIXTEENTH }],
    ['tap', { from: 9 * SIXTEENTH + SWING, until: 9 * SIXTEENTH + SWING + SIXTEENTH }],
  ]);
  assert.deepEqual(
    into.sent.map(({ to: where, messages }) => [where.track, where.play.track, where.play.region, messages[0].t]),
    [
      ['my tap/1', 1, 1, 5 * SIXTEENTH + SWING],
      ['my tap/2', 2, 2, 9 * SIXTEENTH + SWING],
    ],
    "each on its lent track, its launch's region",
  );
});

test('a slot emptied: its clip gone from its track, stopped where it plays', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  clips.put('groove', { to: to('drums'), pattern });
  clips.put('line', { to: to('bass'), pattern });
  clips.launch('groove');
  clips.launch('line');
  clips.remove('groove');
  clips.step(0, 0);
  assert.deepEqual(clips.slotsOn('drums'), []);
  assert.equal(clips.clipIn('groove'), undefined);
  assert.deepEqual(
    into.sent.map(({ to: where }) => where.track),
    ['bass'],
    'the other still plays',
  );
});

test("whether a slot's clip plays: a looping one from its launch until it's stopped; one played once from its start until its last note ends, as the 16ths come", () => {
  const clips = new ClipPlayer({ input: input(), grid });
  clips.put('groove', { to: to('drums'), pattern });
  assert.equal(clips.playing('groove'), false, 'put, not launched');
  clips.launch('groove');
  assert.equal(clips.playing('groove'), true, 'launched to loop');
  clips.stop('drums');
  assert.equal(clips.playing('groove'), false, 'stopped');
  const phrase = { bars: 1, events: [{ start: 0, duration: 2 * STEP, pitch: 50 }] };
  const flower = { kind: 'tap' };
  clips.put(flower, { to: { track: 'tap', clip: flower, live: false }, pattern: phrase, once: true });
  clips.launch(flower);
  clips.step(2, 2 * SIXTEENTH);
  assert.equal(clips.playing(flower), false, 'launched, before its beat');
  clips.step(4, 4 * SIXTEENTH);
  assert.equal(clips.playing(flower), true, 'started on the beat');
  clips.step(5, 5 * SIXTEENTH + SWING);
  assert.equal(clips.playing(flower), true, 'its last note handed on, still sounding');
  clips.step(6, 6 * SIXTEENTH);
  assert.equal(clips.playing(flower), false, 'its last note ended');
  clips.launch(flower);
  clips.step(8, 8 * SIXTEENTH);
  clips.remove(flower);
  assert.equal(clips.playing(flower), false, 'its slot emptied');
});

test('a clip played once on a lent track plays for as long as the track is lent, its ring-out among it', () => {
  const clips = new ClipPlayer({ input: input(), grid });
  const lend = (where, span) => ({
    ...where,
    track: 'my tap/1',
    play: { ...where.play, until: span.until + SIXTEENTH * 3 },
  });
  const phrase = { bars: 1, events: [{ start: 0, duration: STEP, pitch: 50 }] };
  const flower = { kind: 'tap' };
  clips.put(flower, { to: { track: 'tap', clip: flower, live: false }, pattern: phrase, once: true, lend });
  clips.launch(flower);
  clips.step(0, 0);
  clips.step(2, 2 * SIXTEENTH);
  assert.equal(clips.playing(flower), true, 'its last note ended, ringing out');
  clips.step(4, 4 * SIXTEENTH);
  assert.equal(clips.playing(flower), false, 'its track let go');
});

test('a clip launched from a 16th to come: what its track plays plays on till then, the new clip from that 16th', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  launch(clips, { to: to('bass'), pattern }, 'old');
  const queued = { bars: 1, loop: true, events: [{ start: 0, duration: STEP, pitch: 48 }] };
  clips.put('new', { to: to('bass'), pattern: queued });
  clips.step(0, 0);
  clips.launch('new', 16);
  clips.step(1, SIXTEENTH + SWING);
  assert.equal(clips.playing('new'), false, 'queued, not playing');
  assert.equal(clips.playing('old'), true, 'what the track played plays on');
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(
    into.sent.map(({ messages }) => [messages[0].pitch, messages[0].t]),
    [
      [40, 0],
      [38, SIXTEENTH + SWING],
      [48, 16 * SIXTEENTH],
    ],
    'the old clip till the 16th, then the new, the old one silent on it',
  );
  assert.equal(clips.playing('new'), true, 'launched');
  assert.equal(clips.playing('old'), false, 'taken its place');
});

test('a queued launch replaced by a later one on its track, let go by a stop, none from an emptied slot', () => {
  const into = input();
  const clips = new ClipPlayer({ input: into, grid });
  const one = (pitch) => ({
    to: to('bass'),
    pattern: {
      bars: 1,
      loop: true,
      events: [
        { start: 0, duration: STEP, pitch },
        { start: STEP, duration: STEP, pitch },
      ],
    },
  });
  clips.put('a', one(50));
  clips.put('b', one(52));
  clips.put('c', one(54));
  clips.step(0, 0);
  clips.launch('a', 16);
  clips.launch('b', 16);
  clips.step(1, SIXTEENTH + SWING);
  assert.equal(into.sent.length, 0, 'nothing till the 16th asked');
  clips.step(16, 16 * SIXTEENTH);
  assert.deepEqual(
    into.sent.map(({ messages }) => messages[0].pitch),
    [52],
    'the later launch in place of the queued one',
  );
  clips.launch('a', 32);
  clips.stop('bass');
  clips.step(32, 32 * SIXTEENTH);
  clips.step(33, 33 * SIXTEENTH + SWING);
  assert.equal(into.sent.length, 1, 'a stop let the queued launch go');
  clips.launch('c', 48);
  clips.remove('c');
  clips.step(48, 48 * SIXTEENTH);
  clips.step(49, 49 * SIXTEENTH + SWING);
  assert.equal(into.sent.length, 1, 'an emptied slot launched nothing');
  assert.equal(clips.playing('c'), false);
});

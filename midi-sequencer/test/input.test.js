// The sequencer's input's unit tests (mockup/src/libs/midi-sequencer/input.ts; G0a, mockup/architecture/done.md): the input, which passes a
// track's messages on to its instrument at once and puts the play they make into the stream; the messages themselves and a note's index,
// handed out by note rotation, libs/midi/'s since V1 (libs/midi/test/midi.test.js). What the garden plays through it is held to the
// recordings (replays.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sequencer, Stream } from '../index.ts';

const noteOn = (index, t, more = {}) => ({ type: 'note on', index, pitch: 60, velocity: 1, t, ...more });
const noteOff = (index, t) => ({ type: 'note off', index, t });
const perNote = (index, controller, value, t) => ({ type: 'per-note controller', index, controller, value, t });

test("the input: a track's messages go to its instrument at once, as they're sent", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'tap', receive: (messages) => received.push(messages) }),
  });
  const messages = [noteOn(0, 2), noteOff(0, 2.125)];
  sequencer.send({ track: 'tap', clip: { kind: 'tap' }, live: true }, messages);
  assert.deepEqual(received, [messages], 'within the call: no tick waited for');
});

// the stream a sequencer's own (L1b): no module state, so two sequencers, a page's and a test's, are heard apart
test("each sequencer's own stream: its listeners hear its plays, not another sequencer's, until they stop", () => {
  const tracks = () => ({ role: 'tap', receive: () => {} });
  const mine = new Sequencer({ tracks });
  const other = new Sequencer({ tracks });
  const heard = [];
  const stop = mine.onPlay((play) => heard.push(play.notes.length));
  const note = (t) => [
    { type: 'note on', index: 0, pitch: 60, velocity: 1, t },
    { type: 'note off', index: 0, t: t + 0.1 },
  ];
  mine.send({ track: 'tap' }, note(1));
  other.send({ track: 'tap' }, note(2));
  stop();
  mine.send({ track: 'tap' }, note(3));
  assert.deepEqual(heard, [1], "its own play, once: not the other's, none once stopped");
});

test('the input: and into the stream as the play they make, its notes as the stream carries them, after the instrument has them', () => {
  const order = [];
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => order.push('instrument') }) });
  const flower = { kind: 'tap' };
  const plays = [];
  const stop = sequencer.onPlay((play) => {
    order.push('stream');
    plays.push(play);
  });
  sequencer.send({ track: 'tap', clip: flower, live: true }, [noteOn(5, 2, { pitch: 62, part: 1 }), noteOff(5, 2.125)]);
  stop();
  assert.deepEqual(order, ['instrument', 'stream']);
  assert.equal(plays[0].owner, flower, 'its clip: whose it is');
  assert.deepEqual(
    { ...plays[0], owner: undefined },
    {
      owner: undefined,
      kind: 'tap',
      role: 'tap',
      live: true,
      notes: [{ t: 2, pitch: 62, velocity: 1, duration: 0.125, part: 1, index: 5 }],
    },
    'its index, which a later end names it by (G2a); its velocity (G3a)',
  );
});

test("the input: per-note management alone goes to the instrument at once, and puts no play into the stream: a note's bookkeeping, nothing heard", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'tap', receive: (messages) => received.push(messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const messages = [{ type: 'per-note management', index: 4, detach: true, t: 2.5 }];
  sequencer.send({ track: 'tap', clip: { kind: 'tap' }, live: true }, messages);
  stop();
  assert.deepEqual(received, [messages]);
  assert.deepEqual(plays, []);
});

test("the input: a track's instrument looked up by its name, as a replay track's is made the first time it's played on (G0d)", () => {
  const asked = [];
  const instrument = { role: 'tap', receive: () => {} };
  const sequencer = new Sequencer({
    tracks: (track) => {
      asked.push(track);
      return instrument;
    },
  });
  sequencer.send({ track: 'replay tap 2' }, [{ type: 'controller', controller: 'volume', value: 0.8, t: 3 }]);
  assert.deepEqual(asked, ['replay tap 2']);
});

test("the input: a controller, a track's parameter by name, a value at a time, jumping there or gliding by its time constant, to its instrument; into the stream a play of its own on its track, no element, its kind and number as a replay's where they come with it (G3a)", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'tap', receive: (messages) => received.push(...messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const jump = { type: 'controller', controller: 'air', value: 3000, t: 4 };
  const glide = { type: 'controller', controller: 'level', value: 0.5, t: 4.2, glide: 0.08 };
  sequencer.send({ track: 'replay tap 1', play: { kind: 'tap', track: 0 } }, [jump, glide]);
  stop();
  assert.deepEqual(received, [jump, glide]);
  assert.deepEqual(plays, [
    {
      owner: null,
      kind: 'tap',
      role: 'tap',
      live: false,
      notes: [],
      controls: [
        { type: 'controller', controller: 'air', value: 3000, t: 4 },
        { type: 'controller', controller: 'level', value: 0.5, t: 4.2, glide: 0.08 },
      ],
      track: 0,
    },
  ]);
});

test("the input: a track's controller with nothing to name its kind, named by its track (G3a)", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'tap' }, [{ type: 'controller', controller: 'level', value: 0.5, t: 4 }]);
  stop();
  assert.equal(plays[0].kind, 'tap');
  assert.equal(plays[0].owner, null);
});

test("the input: a replay's play into the stream with what the stream carries of it beside its notes, its replay track, until when, its draws, as before G0", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const flower = { kind: 'tap' };
  const sends = { dry: 0.8, reverb: 0.2, delay: null };
  sequencer.send({ track: 'replay tap 2', clip: flower, play: { track: 1, until: 9, sends } }, [
    noteOn(0, 5),
    noteOff(0, 5.25),
  ]);
  stop();
  assert.deepEqual(
    { ...plays[0], owner: undefined },
    {
      owner: undefined,
      kind: 'tap',
      role: 'tap',
      live: false,
      notes: [{ t: 5, pitch: 60, velocity: 1, duration: 0.25, index: 0 }],
      track: 1,
      until: 9,
      sends,
    },
  );
});

test("the input: a vine's replayed note in the stream with its bend, its vibrato and its glides, as before G0", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'trace', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'replay vine 1', clip: { kind: 'vine' } }, [
    noteOn(2, 3, { pitch: 64, part: 4 }),
    perNote(2, 'bend', -1, 2.5),
    perNote(2, 'vibrato depth', 8, 2.5),
    perNote(2, 'pitch', 66, 3.5),
    noteOff(2, 4),
  ]);
  stop();
  assert.deepEqual(plays[0].notes, [
    {
      t: 3,
      pitch: 64,
      velocity: 1,
      duration: 1,
      pitchBend: -1,
      vibrato: 8,
      pitchGlides: [[3.5, 66]],
      part: 4,
      index: 2,
    },
  ]);
  assert.deepEqual(Object.keys(plays[0].notes[0]), [
    't',
    'pitch',
    'velocity',
    'duration',
    'pitchBend',
    'vibrato',
    'pitchGlides',
    'part',
    'index',
  ]);
});

test('the way back: each note the input passes on handed to its listeners at once, with where it went, after the instrument and the stream have it (G0e)', () => {
  const order = [];
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => order.push('instrument') }) });
  const back = [];
  const stopPlays = sequencer.onPlay(() => order.push('stream'));
  sequencer.onNote((address, note) => {
    order.push('way back');
    back.push({ address, note });
  });
  const to = { track: 'tap', clip: { kind: 'tap' }, live: true };
  sequencer.send(to, [
    noteOn(5, 2, { pitch: 62, velocity: 0.35, part: 1 }),
    perNote(5, 'volume', 0.5, 2),
    noteOff(5, 2.125),
    noteOn(6, 2.25),
  ]);
  stopPlays();
  assert.deepEqual(order, ['instrument', 'stream', 'way back', 'way back']);
  assert.equal(back[0].address, to, 'its track, clip and whether it was played as you play');
  assert.deepEqual(
    back.map(({ note }) => [note.noteOn.t, note.noteOn.pitch, note.noteOn.velocity, note.noteOn.part, note.duration]),
    [
      [2, 62, 0.35, 1, 0.125],
      [2.25, 60, 1, undefined, undefined],
    ],
    'each with its time, pitch, velocity and part, and its length where its note off came with it',
  );
});

test('the way back: messages with no note on hand nothing back; a listener stopped hears no more (G0e)', () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => {} }) });
  const back = [];
  const stop = sequencer.onNote((address, note) => back.push(note));
  sequencer.send({ track: 'replay tap 1' }, [{ type: 'controller', controller: 'level', value: 0.5, t: 3 }]);
  sequencer.send({ track: 'tap', clip: { kind: 'tap' } }, [noteOff(1, 3)]); // a note off with its clip, as every one comes (G2a)
  assert.deepEqual(back, []);
  stop();
  sequencer.send({ track: 'tap', clip: { kind: 'tap' } }, [noteOn(1, 4)]);
  assert.deepEqual(back, []);
});

test("a held note's glide and note off sent later (G2a): each a play of its own, no notes, by the note's index; every note with its index", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'trace', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const to = { track: 'trace', clip: { kind: 'vine' }, live: true, play: { region: 3 } };
  sequencer.send(to, [noteOn(5, 1, { pitch: 64 })]);
  sequencer.send(to, [perNote(5, 'pitch', 67, 1.5)]);
  sequencer.send(to, [noteOff(5, 2)]);
  stop();
  assert.deepEqual(
    plays.map(({ notes, ends, glides, region }) => ({ notes, ends, glides, region })),
    [
      { notes: [{ t: 1, pitch: 64, velocity: 1, index: 5 }], ends: undefined, glides: undefined, region: 3 },
      { notes: [], ends: undefined, glides: [{ index: 5, t: 1.5, pitch: 67 }], region: 3 },
      { notes: [], ends: [{ type: 'note off', index: 5, t: 2 }], glides: undefined, region: 3 },
    ],
  );
});

test("a send with new notes and others' note offs, as a held part's key changes (G2a): one play, its notes and its ends", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'held 1', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'background 1', clip: { kind: 'ambient' } }, [noteOff(1, 4), noteOn(2, 4, { pitch: 43 })]);
  stop();
  assert.deepEqual(
    plays.map(({ notes, ends }) => ({ notes, ends })),
    [{ notes: [{ t: 4, pitch: 43, velocity: 1, index: 2 }], ends: [{ type: 'note off', index: 1, t: 4 }] }],
  );
});

test("the way back hands on each note off sent after its note, a held note's, with where it went (G2b); one sent with its note on, its length, not", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'hold', receive: () => {} }) });
  const ends = [];
  const stop = sequencer.onNoteOff((address, end) => ends.push({ track: address.track, ...end }));
  const to = { track: 'hold', clip: { kind: 'bloom' }, live: true };
  sequencer.send(to, [noteOn(4, 1)]);
  sequencer.send({ track: 'tap', clip: { kind: 'tap' }, live: true }, [noteOn(5, 1), noteOff(5, 1.2)]);
  sequencer.send(to, [noteOff(4, 3)]);
  stop();
  sequencer.send(to, [noteOff(4, 4)]);
  assert.deepEqual(ends, [{ track: 'hold', type: 'note off', index: 4, t: 3 }]);
});

test('every note in the stream with its velocity, 0 to 1, as its note on had it (G3a)', () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'replay tap 1', clip: { kind: 'tap' } }, [
    noteOn(0, 5, { velocity: 0.35 }),
    noteOff(0, 5.25),
    noteOn(1, 5.5, { velocity: 0.7 }),
  ]);
  stop();
  assert.deepEqual(
    plays[0].notes.map((note) => note.velocity),
    [0.35, 0.7],
  );
});

test("a note's per-note controllers sent with it in the stream as its controllers, its values as it starts: how it's heard from its own place, its rise; those it carries already, its bend, vibrato and glides, not twice (G3a)", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'hold', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'hold', clip: { kind: 'bloom' }, live: true }, [
    noteOn(3, 10),
    perNote(3, 'brightness', 3000, 9.9),
    perNote(3, 'volume', 0.5, 9.9),
    perNote(3, 'pan', -0.2, 9.9),
    perNote(3, 'effects 1 depth', 0.1, 9.9),
    perNote(3, 'rise', 0.4, 9.9),
    perNote(3, 'bend', -1, 9.9),
    perNote(3, 'vibrato depth', 8, 9.9),
    perNote(3, 'pitch', 62, 10.5),
    perNote(4, 'volume', 0.9, 9.9),
  ]);
  stop();
  const [note] = plays[0].notes;
  assert.deepEqual(note.controllers, { brightness: 3000, volume: 0.5, pan: -0.2, 'effects 1 depth': 0.1, rise: 0.4 });
  assert.equal(note.pitchBend, -1);
  assert.equal(note.vibrato, 8);
  assert.deepEqual(note.pitchGlides, [[10.5, 62]]);
});

test('a note with no per-note controllers but those it carries already has none in the stream (G3a)', () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'trace', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'replay vine 1', clip: { kind: 'vine' } }, [
    noteOn(2, 3),
    perNote(2, 'bend', 1, 3),
    noteOff(2, 4),
  ]);
  stop();
  assert.equal('controllers' in plays[0].notes[0], false);
});

test("a per-note controller sent after its note, but #3 Pitch, its glide: a play of its own by the note's index, a change, jumping there or gliding by its time constant (G3a)", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'tap', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const to = { track: 'tap', clip: { kind: 'tap' }, live: true, play: { region: 2 } };
  sequencer.send(to, [noteOn(5, 1), perNote(5, 'volume', 0.4, 0.9), noteOff(5, 1.25)]);
  sequencer.send(to, [{ ...perNote(5, 'brightness', 3000, 1.5), glide: 0.08 }]);
  sequencer.send(to, [perNote(5, 'pan', 0.3, 1.6), perNote(5, 'pitch', 64, 1.6)]);
  stop();
  assert.deepEqual(
    plays.map(({ owner, notes, changes, glides, region }) => ({ owner, notes: notes.length, changes, glides, region })),
    [
      { owner: to.clip, notes: 1, changes: undefined, glides: undefined, region: 2 },
      {
        owner: to.clip,
        notes: 0,
        changes: [
          { type: 'per-note controller', index: 5, controller: 'brightness', value: 3000, t: 1.5, glide: 0.08 },
        ],
        glides: undefined,
        region: 2,
      },
      {
        owner: to.clip,
        notes: 0,
        changes: [{ type: 'per-note controller', index: 5, controller: 'pan', value: 0.3, t: 1.6 }],
        glides: [{ index: 5, t: 1.6, pitch: 64 }],
        region: 2,
      },
    ],
  );
});

// senders kept apart (P3a, mockup/architecture/done.md; M's, brought forward): on one track, two senders' notes of one index each reach
// the instrument by an index of its own, a note off ending its own; the stream keeps each sender's own
test("two senders' notes of one index on one track kept apart: the instrument hears each note by an index of its own, a note off ending its own; the stream keeps each sender's index (P3a)", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'tap', receive: (messages) => received.push(...messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'tap' }, [noteOn(5, 1)]);
  sequencer.send({ track: 'tap', source: 'playback' }, [noteOn(5, 1.1), perNote(5, 'pan', 0.5, 1.2)]);
  sequencer.send({ track: 'tap', source: 'playback' }, [noteOff(5, 2)]);
  sequencer.send({ track: 'tap' }, [noteOff(5, 3)]);
  stop();
  const [firstOn, secondOn, change, secondOff, firstOff] = received;
  assert.notEqual(firstOn.index, secondOn.index, 'each note an index of its own at the instrument');
  assert.equal(change.index, secondOn.index, "a change to the playback's note, its own");
  assert.equal(secondOff.index, secondOn.index, "the playback's note off ends the playback's note");
  assert.equal(firstOff.index, firstOn.index, "and the other sender's its own");
  assert.deepEqual(
    plays.map((play) => play.notes[0]?.index ?? play.ends[0].index),
    [5, 5, 5, 5],
    "the stream: each sender's own index",
  );
});

test("a note ringing out after its note off still gets its sender's changes and its detach, though its index is free again for a new note, last in turn (P3a)", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'tap', receive: (messages) => received.push(...messages) }),
  });
  sequencer.send({ track: 'tap' }, [noteOn(7, 1)]);
  sequencer.send({ track: 'tap' }, [noteOff(7, 2)]);
  sequencer.send({ track: 'tap', source: 'playback' }, [noteOn(7, 2.1)]);
  sequencer.send({ track: 'tap' }, [
    perNote(7, 'pan', 0.3, 2.5),
    { type: 'per-note management', index: 7, detach: true, t: 3 },
  ]);
  const [on, off, other, change, detach] = received;
  assert.equal(off.index, on.index);
  assert.notEqual(other.index, on.index, 'the other note a new index, the one freed last in turn');
  assert.deepEqual([change.index, detach.index], [on.index, on.index], 'ringing out, still its own');
});

test('the stream: every play to whoever listens, until they stop', () => {
  const stream = new Stream();
  const got = [];
  const stop = stream.onPlay((p) => got.push(p.kind));
  stream.played({ kind: 'tap', notes: [] });
  stop();
  stream.played({ kind: 'vine', notes: [] });
  assert.deepEqual(got, ['tap']);
});

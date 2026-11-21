// The sequencer's input (sequencing/midi-sequencer/input.ts): a track's messages go to its
// instrument at once and into the stream as the play they make; each note comes back to its listeners.
// The messages, and a note's index handed out by note rotation, are midi/protocol/'s
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sequencer } from '../index.ts';

const noteOn = (index, t, more = {}) => ({ type: 'note on', index, pitch: 60, velocity: 1, t, ...more });
const noteOff = (index, t) => ({ type: 'note off', index, t });
const perNote = (index, controller, value, t) => ({ type: 'per-note controller', index, controller, value, t });

// the stream a sequencer's own: no module state, so two sequencers are heard apart
test("each sequencer's own stream: its listeners hear its plays, not another sequencer's, until they stop", () => {
  const tracks = () => ({ role: 'lead', receive: () => {} });
  const mine = new Sequencer({ tracks });
  const other = new Sequencer({ tracks });
  const heard = [];
  const stop = mine.onPlay((play) => heard.push(play.notes.length));
  const note = (t) => [
    { type: 'note on', index: 0, pitch: 60, velocity: 1, t },
    { type: 'note off', index: 0, t: t + 0.1 },
  ];
  mine.send({ track: 'lead' }, note(1));
  other.send({ track: 'lead' }, note(2));
  stop();
  mine.send({ track: 'lead' }, note(3));
  assert.deepEqual(heard, [1], "its own play, once: not the other's, none once stopped");
});

test('the input: and into the stream as the play they make, its notes as the stream carries them, after the instrument has them', () => {
  const order = [];
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => order.push('instrument') }) });
  const light = { kind: 'lead' };
  const plays = [];
  const stop = sequencer.onPlay((play) => {
    order.push('stream');
    plays.push(play);
  });
  sequencer.send({ track: 'lead', clip: light, live: true }, [
    noteOn(5, 2, { pitch: 62, velocity: 0.35, part: 1 }),
    noteOff(5, 2.125),
  ]);
  stop();
  assert.deepEqual(order, ['instrument', 'stream']);
  assert.equal(plays[0].owner, light, 'its clip: whose it is');
  assert.deepEqual(
    { ...plays[0], owner: undefined },
    {
      owner: undefined,
      kind: 'lead',
      role: 'lead',
      live: true,
      notes: [{ t: 2, pitch: 62, velocity: 0.35, duration: 0.125, part: 1, index: 5 }],
      trackName: 'lead',
    },
    'its index, which a later end names it by; its velocity as its note on had it, 0 to 1; the track it was sent to, by name',
  );
});

test("the input: a track's messages go to its instrument at once, as they're sent; per-note management alone puts no play into the stream: a note's bookkeeping, nothing heard", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'lead', receive: (messages) => received.push(messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const messages = [{ type: 'per-note management', index: 4, detach: true, t: 2.5 }];
  sequencer.send({ track: 'lead', clip: { kind: 'lead' }, live: true }, messages);
  stop();
  assert.deepEqual(received, [messages], 'within the call: no tick waited for');
  assert.deepEqual(plays, []);
});

test("the input: a track's instrument looked up by its name, as a track made the first time it's played on is", () => {
  const asked = [];
  const instrument = { role: 'lead', receive: () => {} };
  const sequencer = new Sequencer({
    tracks: (track) => {
      asked.push(track);
      return instrument;
    },
  });
  sequencer.send({ track: 'track 2' }, [{ type: 'controller', controller: 'volume', value: 0.8, t: 3 }]);
  assert.deepEqual(asked, ['track 2']);
});

test("the input: a controller, a track's parameter by name, a value at a time, jumping there or gliding by its time constant, to its instrument; into the stream a play of its own on its track, no element, its kind and number as a replayed play's where they come with it", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'lead', receive: (messages) => received.push(...messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const jump = { type: 'controller', controller: 'air', value: 3000, t: 4 };
  const glide = { type: 'controller', controller: 'level', value: 0.5, t: 4.2, glide: 0.08 };
  sequencer.send({ track: 'track 1', play: { kind: 'lead', track: 0 } }, [jump, glide]);
  stop();
  assert.deepEqual(received, [jump, glide]);
  assert.deepEqual(plays, [
    {
      owner: null,
      kind: 'lead',
      role: 'lead',
      live: false,
      notes: [],
      controls: [
        { type: 'controller', controller: 'air', value: 3000, t: 4 },
        { type: 'controller', controller: 'level', value: 0.5, t: 4.2, glide: 0.08 },
      ],
      track: 0,
      trackName: 'track 1',
    },
  ]);
});

test("the input: a track's controller with nothing to name its kind, named by its track, not by its role", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'track 2' }, [{ type: 'controller', controller: 'level', value: 0.5, t: 4 }]);
  stop();
  assert.equal(plays[0].kind, 'track 2');
  assert.equal(plays[0].role, 'lead');
  assert.equal(plays[0].owner, null);
});

test("the input: a replayed play into the stream with what the stream carries of it beside its notes, its track's number and until when", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const light = { kind: 'lead' };
  sequencer.send({ track: 'track 2', clip: light, play: { track: 1, until: 9 } }, [noteOn(0, 5), noteOff(0, 5.25)]);
  stop();
  assert.deepEqual(
    { ...plays[0], owner: undefined },
    {
      owner: undefined,
      kind: 'lead',
      role: 'lead',
      live: false,
      notes: [{ t: 5, pitch: 60, velocity: 1, duration: 0.25, index: 0 }],
      track: 1,
      trackName: 'track 2',
      until: 9,
    },
  );
});

test('the way back: each note the input passes on handed to its listeners at once, with where it went, after the instrument and the stream have it', () => {
  const order = [];
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => order.push('instrument') }) });
  const back = [];
  const stopPlays = sequencer.onPlay(() => order.push('stream'));
  sequencer.onNote((address, note) => {
    order.push('way back');
    back.push({ address, note });
  });
  const to = { track: 'lead', clip: { kind: 'lead' }, live: true };
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

test('the way back: messages with no note on hand nothing back; a listener stopped hears no more', () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => {} }) });
  const back = [];
  const stop = sequencer.onNote((address, note) => back.push(note));
  sequencer.send({ track: 'track 1' }, [{ type: 'controller', controller: 'level', value: 0.5, t: 3 }]);
  sequencer.send({ track: 'lead', clip: { kind: 'lead' } }, [noteOff(1, 3)]); // a note off with its clip, as every one comes
  assert.deepEqual(back, []);
  stop();
  sequencer.send({ track: 'lead', clip: { kind: 'lead' } }, [noteOn(1, 4)]);
  assert.deepEqual(back, []);
});

test("a held note's glide and note off sent later: each a play of its own, no notes, by the note's index, its glide a change of its pitch; every note with its index", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'bowed', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const to = { track: 'bowed', clip: { kind: 'bowed' }, live: true, play: { region: 3 } };
  sequencer.send(to, [noteOn(5, 1, { pitch: 64 })]);
  sequencer.send(to, [perNote(5, 'pitch', 67, 1.5)]);
  sequencer.send(to, [noteOff(5, 2)]);
  stop();
  assert.deepEqual(
    plays.map(({ notes, ends, changes, region }) => ({ notes, ends, changes, region })),
    [
      { notes: [{ t: 1, pitch: 64, velocity: 1, index: 5 }], ends: undefined, changes: undefined, region: 3 },
      {
        notes: [],
        ends: undefined,
        changes: [{ type: 'per-note controller', index: 5, controller: 'pitch', value: 67, t: 1.5 }],
        region: 3,
      },
      { notes: [], ends: [{ type: 'note off', index: 5, t: 2 }], changes: undefined, region: 3 },
    ],
  );
});

test("a send with new notes and others' note offs, as a held part's key changes: one play, its notes and its ends", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'drone', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'drone 1', clip: { kind: 'drone' } }, [noteOff(1, 4), noteOn(2, 4, { pitch: 43 })]);
  stop();
  assert.deepEqual(
    plays.map(({ notes, ends }) => ({ notes, ends })),
    [{ notes: [{ t: 4, pitch: 43, velocity: 1, index: 2 }], ends: [{ type: 'note off', index: 1, t: 4 }] }],
  );
});

test("the way back hands on each note off sent after its note, a held note's, with where it went; one sent with its note on, its length, not", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'pad', receive: () => {} }) });
  const ends = [];
  const stop = sequencer.onNoteOff((address, end) => ends.push({ track: address.track, ...end }));
  const to = { track: 'pad', clip: { kind: 'pad' }, live: true };
  sequencer.send(to, [noteOn(4, 1)]);
  sequencer.send({ track: 'lead', clip: { kind: 'lead' }, live: true }, [noteOn(5, 1), noteOff(5, 1.2)]);
  sequencer.send(to, [noteOff(4, 3)]);
  stop();
  sequencer.send(to, [noteOff(4, 4)]);
  assert.deepEqual(ends, [{ track: 'pad', type: 'note off', index: 4, t: 3 }]);
});

test("a note's per-note controllers sent with it in the stream as its controllers, by MIDI's names, its values as it starts: how it's heard from its own place, its rise, its bend and vibrato depth; its #3 Pitch changes its glides", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'pad', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'pad', clip: { kind: 'pad' }, live: true }, [
    noteOn(3, 10, { pitch: 64, part: 4 }),
    perNote(3, 'brightness', 3000, 9.9),
    perNote(3, 'volume', 0.5, 9.9),
    perNote(3, 'pan', -0.2, 9.9),
    perNote(3, 'effects 1 depth', 0.1, 9.9),
    perNote(3, 'rise', 0.4, 9.9),
    perNote(3, 'bend', -1, 9.9),
    perNote(3, 'vibrato depth', 8, 9.9),
    perNote(3, 'pitch', 62, 10.5),
    perNote(4, 'volume', 0.9, 9.9),
    noteOff(3, 11),
  ]);
  stop();
  const [note] = plays[0].notes;
  assert.deepEqual(note.controllers, {
    brightness: 3000,
    volume: 0.5,
    pan: -0.2,
    'effects 1 depth': 0.1,
    rise: 0.4,
    bend: -1,
    'vibrato depth': 8,
  });
  assert.deepEqual(note.glides, [[10.5, 62]]);
  assert.deepEqual(Object.keys(note), ['t', 'pitch', 'velocity', 'duration', 'controllers', 'glides', 'part', 'index']);
  assert.deepEqual([note.t, note.pitch, note.duration, note.part, note.index], [10, 64, 1, 4, 3]);
});

test("a per-note controller sent after its note, #3 Pitch, its glide, among them: a play of its own by the note's index, a change, jumping there or gliding by its time constant", () => {
  const sequencer = new Sequencer({ tracks: () => ({ role: 'lead', receive: () => {} }) });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  const to = { track: 'lead', clip: { kind: 'lead' }, live: true, play: { region: 2 } };
  sequencer.send(to, [noteOn(5, 1), perNote(5, 'volume', 0.4, 0.9), noteOff(5, 1.25)]);
  sequencer.send(to, [{ ...perNote(5, 'brightness', 3000, 1.5), glide: 0.08 }]);
  sequencer.send(to, [perNote(5, 'pan', 0.3, 1.6), perNote(5, 'pitch', 64, 1.6)]);
  stop();
  assert.deepEqual(
    plays.map(({ owner, notes, changes, region }) => ({ owner, notes: notes.length, changes, region })),
    [
      { owner: to.clip, notes: 1, changes: undefined, region: 2 },
      {
        owner: to.clip,
        notes: 0,
        changes: [
          { type: 'per-note controller', index: 5, controller: 'brightness', value: 3000, t: 1.5, glide: 0.08 },
        ],
        region: 2,
      },
      {
        owner: to.clip,
        notes: 0,
        changes: [
          { type: 'per-note controller', index: 5, controller: 'pan', value: 0.3, t: 1.6 },
          { type: 'per-note controller', index: 5, controller: 'pitch', value: 64, t: 1.6 },
        ],
        region: 2,
      },
    ],
  );
});

// senders kept apart (M's, brought forward): on one track, two senders' notes of one index each reach
// the instrument by an index of its own, a note off ending its own; the stream keeps each sender's own
test("two senders' notes of one index on one track kept apart: the instrument hears each note by an index of its own, a note off ending its own; the stream keeps each sender's index", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'lead', receive: (messages) => received.push(...messages) }),
  });
  const plays = [];
  const stop = sequencer.onPlay((play) => plays.push(play));
  sequencer.send({ track: 'lead' }, [noteOn(5, 1)]);
  sequencer.send({ track: 'lead', source: 'playback' }, [noteOn(5, 1.1), perNote(5, 'pan', 0.5, 1.2)]);
  sequencer.send({ track: 'lead', source: 'playback' }, [noteOff(5, 2)]);
  sequencer.send({ track: 'lead' }, [noteOff(5, 3)]);
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

test("a note ringing out after its note off still gets its sender's changes and its detach, though its index is free again for a new note, last in turn", () => {
  const received = [];
  const sequencer = new Sequencer({
    tracks: () => ({ role: 'lead', receive: (messages) => received.push(...messages) }),
  });
  sequencer.send({ track: 'lead' }, [noteOn(7, 1)]);
  sequencer.send({ track: 'lead' }, [noteOff(7, 2)]);
  sequencer.send({ track: 'lead', source: 'playback' }, [noteOn(7, 2.1)]);
  sequencer.send({ track: 'lead' }, [
    perNote(7, 'pan', 0.3, 2.5),
    { type: 'per-note management', index: 7, detach: true, t: 3 },
  ]);
  const [on, off, other, change, detach] = received;
  assert.equal(off.index, on.index);
  assert.notEqual(other.index, on.index, 'the other note a new index, the one freed last in turn');
  assert.deepEqual([change.index, detach.index], [on.index, on.index], 'ringing out, still its own');
});

// input monitoring by sender: a surface switched off, as a DAW's monitoring of an input is
function monitoredSequencer() {
  const received = [];
  const sequencer = new Sequencer({
    tracks: (name) => ({
      role: 'lead',
      receive: (messages) => received.push(...messages.map((m) => ({ ...m, name }))),
    }),
  });
  const plays = [];
  sequencer.onPlay((play) => plays.push(play));
  return { sequencer, received, plays };
}
const surface = { track: 'pad', source: 'surface' };

test("a sender switched off from a time: its held notes hushed there, none let go; its new notes and controllers from then dropped, an earlier note's end passed; another sender's passed", () => {
  const { sequencer, received } = monitoredSequencer();
  sequencer.send(surface, [noteOn(1, 1), perNote(1, 'volume', 0.5, 1)]);
  sequencer.send(surface, [noteOn(2, 1.1)]);
  sequencer.send({ track: 'pad', source: 'keys' }, [noteOn(1, 1.2)]);
  received.splice(0);
  sequencer.monitor('surface', false, 4, 0.25);
  assert.deepEqual(
    received.splice(0),
    [0, 1].map((index) => ({ ...perNote(index, 'volume', 0, 4), glide: 0.25, name: 'pad' })),
    "both its held notes hushed, none let go, by the track index of each, not the keys sender's",
  );
  sequencer.send(surface, [
    noteOn(3, 3), // before the switch: passed
    noteOn(4, 5), // from the switch: dropped
    perNote(4, 'pan', 0.2, 5),
    noteOff(4, 6),
    { type: 'controller', controller: 'cutoff', value: 0.3, t: 5 },
    noteOff(1, 5), // an earlier note's end: passed
  ]);
  assert.deepEqual(
    received.splice(0),
    [
      { ...noteOn(3, 3), name: 'pad' },
      { ...noteOff(0, 5), name: 'pad' },
    ],
    "only the note before the switch, and the earlier note's end; no controller, not the dropped note's end",
  );
  sequencer.send({ track: 'pad', source: 'keys' }, [
    noteOn(5, 5),
    { type: 'controller', controller: 'cutoff', value: 1, t: 5 },
  ]);
  assert.deepEqual(
    received,
    [
      { ...noteOn(4, 5), name: 'pad' },
      { type: 'controller', controller: 'cutoff', value: 1, t: 5, name: 'pad' },
    ],
    "another sender's passed, its note on the track's next index",
  );
});

test('a sender switched on again: its held notes brought back to the volume each had, none struck again; nothing of it on the stream', () => {
  const { sequencer, received, plays } = monitoredSequencer();
  sequencer.send(surface, [noteOn(1, 1), perNote(1, 'volume', 0.5, 1)]);
  sequencer.send(surface, [noteOn(2, 1.1)]);
  sequencer.monitor('surface', false, 4, 0.25);
  sequencer.send(surface, [perNote(1, 'volume', 0.9, 4.5)]); // dropped: the last volume stays 0.5
  received.splice(0);
  plays.splice(0);
  sequencer.monitor('surface', true, 8, 0.5);
  assert.deepEqual(
    received.splice(0),
    [
      { ...perNote(0, 'volume', 0.5, 8), glide: 0.5, name: 'pad' },
      { ...perNote(1, 'volume', 1, 8), glide: 0.5, name: 'pad' },
    ],
    'each to the volume it had, one set, one never; none struck again',
  );
  assert.deepEqual(plays, [], 'not on the stream, so not recorded');
  sequencer.send(surface, [noteOn(6, 9)]);
  assert.deepEqual(received, [{ ...noteOn(2, 9), name: 'pad' }], 'its new notes passed again');
});

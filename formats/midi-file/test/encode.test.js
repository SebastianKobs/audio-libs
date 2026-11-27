// A Standard MIDI File written (formats/midi-file/encode.ts): known bytes, the events' order at one tick, the refusals
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeMidiFile } from '../index.ts';
import { END_OF_TRACK, chunk, fileOf, header } from './midi-bytes.js';

const NO_TRACK = { notes: [], controllers: [] };
const ONE_NOTE = {
  format: 0,
  ppq: 96,
  tracks: [{ notes: [{ tick: 0, duration: 96, pitch: 60, velocity: 100, channel: 0 }], controllers: [] }],
  tempos: [{ tick: 0, microsecondsPerQuarter: 500000 }],
  timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
};

// a track's events' bytes, its header and its end taken off
function eventsOf(bytes, trackStart = 14) {
  return [...bytes.subarray(trackStart + 8, bytes.length - END_OF_TRACK.length)];
}
// a file of one track holding one controller at a tick, its delta the tick
function controllerAt(tick) {
  return encodeMidiFile({
    format: 0,
    ppq: 96,
    tracks: [{ notes: [], controllers: [{ tick, controller: 1, value: 2, channel: 0 }] }],
    tempos: [],
    timeSignatures: [],
  });
}

test('format 0, a note at 120 bpm in 4/4: the header, the tempo, the time signature, the note on and off, the end', () => {
  const expected = fileOf(
    header(0, 1, 96),
    chunk(
      'MTrk',
      [
        [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20], // 500 000 µs a quarter
        [0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08], // 4/4: the denominator as a power of 2, 24 clocks a click, 8 32nds a quarter
        [0x00, 0x90, 0x3c, 0x64],
        [0x60, 0x80, 0x3c, 0x40], // 96 ticks on, let go with the release velocity 64 stands for none
        END_OF_TRACK,
      ].flat(),
    ),
  );
  assert.deepEqual(encodeMidiFile(ONE_NOTE), expected);
});

test('delta times as variable-length quantities: the standard’s own table', () => {
  const table = [
    { tick: 0x00, delta: [0x00] },
    { tick: 0x40, delta: [0x40] },
    { tick: 0x7f, delta: [0x7f] },
    { tick: 0x80, delta: [0x81, 0x00] },
    { tick: 0x2000, delta: [0xc0, 0x00] },
    { tick: 0x3fff, delta: [0xff, 0x7f] },
    { tick: 0x4000, delta: [0x81, 0x80, 0x00] },
    { tick: 0x100000, delta: [0xc0, 0x80, 0x00] },
    { tick: 0x1fffff, delta: [0xff, 0xff, 0x7f] },
    { tick: 0x200000, delta: [0x81, 0x80, 0x80, 0x00] },
    { tick: 0x8000000, delta: [0xc0, 0x80, 0x80, 0x00] },
    { tick: 0xfffffff, delta: [0xff, 0xff, 0xff, 0x7f] },
  ];
  for (const { tick, delta } of table) {
    assert.deepEqual(eventsOf(controllerAt(tick)), [...delta, 0xb0, 0x01, 0x02], `tick ${tick}`);
  }
});

test('a controller on a channel: its status 0xB0 and the channel, its number, its value', () => {
  const bytes = encodeMidiFile({
    format: 0,
    ppq: 480,
    tracks: [{ notes: [], controllers: [{ tick: 0, controller: 4, value: 90, channel: 9 }] }],
    tempos: [],
    timeSignatures: [],
  });
  assert.deepEqual(eventsOf(bytes), [0x00, 0xb9, 0x04, 0x5a]);
  assert.deepEqual([...bytes.subarray(12, 14)], [0x01, 0xe0], 'ppq 480');
});

test('at one tick: the tempo and time signature first, then notes let go, then controllers, then notes begun', () => {
  const bytes = encodeMidiFile({
    format: 0,
    ppq: 96,
    tracks: [
      {
        notes: [
          { tick: 10, duration: 10, pitch: 60, velocity: 90, channel: 0 },
          { tick: 0, duration: 10, pitch: 60, velocity: 80, channel: 0 },
        ],
        controllers: [{ tick: 10, controller: 4, value: 127, channel: 0 }],
      },
    ],
    tempos: [{ tick: 10, microsecondsPerQuarter: 600000 }],
    timeSignatures: [],
  });
  assert.deepEqual(
    eventsOf(bytes),
    [
      [0x00, 0x90, 0x3c, 0x50],
      [0x0a, 0xff, 0x51, 0x03, 0x09, 0x27, 0xc0],
      [0x00, 0x80, 0x3c, 0x40],
      [0x00, 0xb0, 0x04, 0x7f],
      [0x00, 0x90, 0x3c, 0x5a],
      [0x0a, 0x80, 0x3c, 0x40],
    ].flat(),
  );
});

test('format 1: a track chunk a track, the tempo map and time signatures in the first', () => {
  const bytes = encodeMidiFile({
    format: 1,
    ppq: 96,
    tracks: [NO_TRACK, { notes: [{ tick: 0, duration: 1, pitch: 36, velocity: 1, channel: 9 }], controllers: [] }],
    tempos: [{ tick: 0, microsecondsPerQuarter: 500000 }],
    timeSignatures: [{ tick: 96, numerator: 7, denominator: 8 }],
  });
  const conductor = chunk(
    'MTrk',
    [[0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20], [0x60, 0xff, 0x58, 0x04, 0x07, 0x03, 0x18, 0x08], END_OF_TRACK].flat(),
  );
  const drums = chunk('MTrk', [[0x00, 0x99, 0x24, 0x01], [0x01, 0x89, 0x24, 0x40], END_OF_TRACK].flat());
  assert.deepEqual(bytes, fileOf(header(1, 2, 96), conductor, drums));
});

test('what a file can’t hold is refused, saying where and what', () => {
  const note = ONE_NOTE.tracks[0].notes[0];
  const withNote = (change) => ({ tracks: [{ notes: [{ ...note, ...change }], controllers: [] }] });
  const refusals = [
    { change: { ppq: 0 }, refusal: /ppq is a whole number from 1 to 32767, not 0/ },
    { change: { format: 2 }, refusal: /format is 0 or 1, not 2/ },
    { change: { tracks: [NO_TRACK, NO_TRACK] }, refusal: /format 0 holds one track, not 2/ },
    { change: { format: 1, tracks: [] }, refusal: /holds at least one track/ },
    {
      change: withNote({ pitch: 128 }),
      refusal: /track 1, note 1: its pitch is a whole number from 0 to 127, not 128/,
    },
    { change: withNote({ velocity: 0 }), refusal: /its velocity is a whole number from 1 to 127, not 0/ },
    { change: withNote({ channel: 16 }), refusal: /its channel is a whole number from 0 to 15, not 16/ },
    { change: withNote({ tick: -1 }), refusal: /its tick is a whole number from 0 up, not -1/ },
    { change: withNote({ duration: 1.5 }), refusal: /its duration is a whole number from 0 up, not 1.5/ },
    {
      change: { tracks: [{ notes: [], controllers: [{ tick: 0, controller: 128, value: 0, channel: 0 }] }] },
      refusal: /track 1, controller 1: its controller is a whole number from 0 to 127, not 128/,
    },
    {
      change: { tempos: [{ tick: 0, microsecondsPerQuarter: 0 }] },
      refusal: /tempo 1: its microsecondsPerQuarter is a whole number from 1 to 16777215, not 0/,
    },
    {
      change: { timeSignatures: [{ tick: 0, numerator: 4, denominator: 3 }] },
      refusal: /time signature 1: its denominator is a power of 2 from 1 to 64, not 3/,
    },
    {
      change: { tracks: [{ notes: [], controllers: [{ tick: 0x10000000, controller: 1, value: 0, channel: 0 }] }] },
      refusal: /a gap of 268435456 ticks between two events, over the 268435455 a delta time holds/,
    },
  ];
  for (const { change, refusal } of refusals) {
    assert.throws(() => encodeMidiFile({ ...ONE_NOTE, ...change }), refusal, JSON.stringify(change));
  }
});

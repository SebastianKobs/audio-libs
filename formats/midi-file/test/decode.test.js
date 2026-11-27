// A Standard MIDI File read (formats/midi-file/decode.ts): known bytes, round trips, running status, notes paired, what's skipped,
// and malformed files refused
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeMidiFile, encodeMidiFile } from '../index.ts';
import { chunk, fileOf, header, track } from './midi-bytes.js';

const NOTHING_ELSE = { controllers: [] };

test('a file’s bytes read back: its format, its ppq, its tempo map, its time signatures, its notes', () => {
  const bytes = fileOf(
    header(0, 1, 96),
    track(
      [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
      [0x00, 0xff, 0x58, 0x04, 0x06, 0x03, 0x18, 0x08],
      [0x00, 0x90, 0x3c, 0x64],
      [0x60, 0x80, 0x3c, 0x40],
    ),
  );
  assert.deepEqual(decodeMidiFile(bytes), {
    format: 0,
    ppq: 96,
    tracks: [{ notes: [{ tick: 0, duration: 96, pitch: 60, velocity: 100, channel: 0 }], ...NOTHING_ELSE }],
    tempos: [{ tick: 0, microsecondsPerQuarter: 500000 }],
    timeSignatures: [{ tick: 0, numerator: 6, denominator: 8 }],
  });
});

test('round trips, format 0 and 1: what’s written is read back the same', () => {
  const files = [
    {
      format: 0,
      ppq: 480,
      tracks: [
        {
          notes: [
            { tick: 0, duration: 240, pitch: 36, velocity: 127, channel: 9 },
            { tick: 0, duration: 120, pitch: 42, velocity: 64, channel: 9 },
            { tick: 240, duration: 0, pitch: 38, velocity: 1, channel: 9 },
            { tick: 100000, duration: 70000, pitch: 49, velocity: 90, channel: 9 },
          ],
          controllers: [
            { tick: 0, controller: 4, value: 0, channel: 9 },
            { tick: 240, controller: 4, value: 127, channel: 9 },
          ],
        },
      ],
      tempos: [
        { tick: 0, microsecondsPerQuarter: 500000 },
        { tick: 1920, microsecondsPerQuarter: 451128 },
      ],
      timeSignatures: [
        { tick: 0, numerator: 4, denominator: 4 },
        { tick: 1920, numerator: 7, denominator: 8 },
      ],
    },
    {
      format: 1,
      ppq: 96,
      tracks: [
        { notes: [], controllers: [] },
        { notes: [{ tick: 5, duration: 7, pitch: 60, velocity: 100, channel: 0 }], controllers: [] },
        { notes: [], controllers: [{ tick: 3, controller: 64, value: 127, channel: 15 }] },
      ],
      tempos: [{ tick: 0, microsecondsPerQuarter: 1000000 }],
      timeSignatures: [],
    },
  ];
  for (const file of files) {
    assert.deepEqual(decodeMidiFile(encodeMidiFile(file)), file, `format ${file.format}`);
  }
});

test('running status: a status byte left out repeats the last; a note on of velocity 0 lets a note go', () => {
  const bytes = fileOf(
    header(0, 1, 96),
    track(
      [0x00, 0x90, 0x3c, 0x64], // C on
      [0x00, 0x3e, 0x50], // D on, the status run on
      [0x0c, 0x3c, 0x00], // C off, as a note on of velocity 0
      [0x0c, 0x3e, 0x00], // D off
      [0x00, 0xb1, 0x07, 0x64], // a controller on channel 1
      [0x0c, 0x07, 0x32], // and another, its status run on
    ),
  );
  const [read] = decodeMidiFile(bytes).tracks;
  assert.deepEqual(read.notes, [
    { tick: 0, duration: 12, pitch: 60, velocity: 100, channel: 0 },
    { tick: 0, duration: 24, pitch: 62, velocity: 80, channel: 0 },
  ]);
  assert.deepEqual(read.controllers, [
    { tick: 24, controller: 7, value: 100, channel: 1 },
    { tick: 36, controller: 7, value: 50, channel: 1 },
  ]);
});

test('notes overlapping on one pitch: each note off lets go the earliest still held on its pitch and channel', () => {
  const bytes = fileOf(
    header(0, 1, 96),
    track(
      [0x00, 0x90, 0x26, 0x40],
      [0x0a, 0x90, 0x26, 0x50],
      [0x00, 0x91, 0x26, 0x60], // the same pitch on another channel, a note of its own
      [0x0a, 0x80, 0x26, 0x00],
      [0x0a, 0x80, 0x26, 0x00],
      [0x00, 0x81, 0x26, 0x00],
    ),
  );
  assert.deepEqual(decodeMidiFile(bytes).tracks[0].notes, [
    { tick: 0, duration: 20, pitch: 38, velocity: 64, channel: 0 },
    { tick: 10, duration: 20, pitch: 38, velocity: 80, channel: 0 },
    { tick: 10, duration: 20, pitch: 38, velocity: 96, channel: 1 },
  ]);
});

test('a note never let go ends with its track; a note off with no note on is let be', () => {
  const bytes = fileOf(
    header(0, 1, 96),
    track([0x00, 0x80, 0x30, 0x00], [0x00, 0x90, 0x3c, 0x64], [0x30, 0xff, 0x2f, 0x00]),
  );
  assert.deepEqual(decodeMidiFile(bytes).tracks[0].notes, [
    { tick: 0, duration: 48, pitch: 60, velocity: 100, channel: 0 },
  ]);
});

test('skipped safely: unknown meta events, sysex both ways, other channel messages, a chunk of an unknown type', () => {
  const bytes = fileOf(
    header(0, 1, 96),
    chunk('XFIH', [0x01, 0x02, 0x03]),
    track(
      [0x00, 0xff, 0x03, 0x05, ...new TextEncoder().encode('Drums')], // a track's name
      [0x00, 0xff, 0x7f, 0x03, 0x00, 0x00, 0x41], // sequencer-specific
      [0x00, 0xf0, 0x05, 0x7e, 0x7f, 0x09, 0x01, 0xf7], // a sysex: General MIDI on
      [0x00, 0xf7, 0x02, 0xf3, 0x01], // an escaped one, any bytes
      [0x00, 0xc0, 0x05], // a program change, one data byte
      [0x00, 0xe0, 0x00, 0x40], // a pitch bend, two
      [0x00, 0xd0, 0x10], // channel pressure, one
      [0x00, 0x90, 0x3c, 0x64],
      [0x01, 0x80, 0x3c, 0x00],
    ),
  );
  assert.deepEqual(decodeMidiFile(bytes).tracks, [
    { notes: [{ tick: 0, duration: 1, pitch: 60, velocity: 100, channel: 0 }], controllers: [] },
  ]);
});

test('the tempo map from every track, in time order', () => {
  const tempo = (delta, high) => [delta, 0xff, 0x51, 0x03, high, 0x00, 0x00];
  const bytes = fileOf(header(1, 2, 96), track(tempo(0x00, 0x07), tempo(0x60, 0x08)), track(tempo(0x30, 0x09)));
  assert.deepEqual(
    decodeMidiFile(bytes).tempos.map(({ tick, microsecondsPerQuarter }) => [tick, microsecondsPerQuarter >> 16]),
    [
      [0, 7],
      [48, 9],
      [96, 8],
    ],
  );
});

test('a truncated file is refused at every length short of whole, saying it is cut short', () => {
  const whole = encodeMidiFile({
    format: 1,
    ppq: 96,
    tracks: [
      { notes: [{ tick: 0, duration: 200, pitch: 60, velocity: 100, channel: 0 }], controllers: [] },
      { notes: [], controllers: [{ tick: 0x4000, controller: 1, value: 1, channel: 0 }] },
    ],
    tempos: [{ tick: 0, microsecondsPerQuarter: 500000 }],
    timeSignatures: [],
  });
  for (let length = 0; length < whole.length; length++) {
    assert.throws(() => decodeMidiFile(whole.subarray(0, length)), /cut short/, `${length} of ${whole.length} bytes`);
  }
});

test('malformed files refused, each saying what is wrong and where', () => {
  const malformed = [
    [
      fileOf([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96]),
      /not a MIDI file: it starts with RIFF, not MThd/i,
    ],
    [fileOf(header(2, 1, 96), track()), /format 2 isn't read: only formats 0 and 1/],
    [fileOf(header(0, 1, 0xe728), track()), /ticks by SMPTE frames aren't read: only ticks to a quarter/],
    [fileOf(header(0, 1, 0), track()), /0 ticks to a quarter/],
    [fileOf(header(0, 2, 96), track(), track()), /format 0 holds one track, not 2/],
    [fileOf(header(0, 1, 96), track([0x00, 0x3c, 0x64])), /a data byte, 0x3c, where a status byte is due, at byte 23/],
    [
      fileOf(header(0, 1, 96), track([0x00, 0xf0, 0x01, 0x00], [0x00, 0x3c, 0x64])),
      /a data byte, 0x3c, where a status byte is due/,
    ],
    [
      fileOf(header(0, 1, 96), track([0x00, 0x90, 0x3c, 0x80])),
      /a status byte, 0x80, where a data byte is due, at byte 25/,
    ],
    [fileOf(header(0, 1, 96), track([0x00, 0xf4])), /status 0xf4 has no place in a MIDI file, at byte 23/],
    [
      fileOf(header(0, 1, 96), track([0x00, 0xff, 0x51, 0x02, 0x07, 0xa1])),
      /a tempo event of 2 bytes, not 3, at byte 23/,
    ],
    [
      fileOf(header(0, 1, 96), track([0x00, 0xff, 0x58, 0x02, 0x04, 0x02])),
      /a time signature of 2 bytes, not 4, at byte 23/,
    ],
    [
      fileOf(header(0, 1, 96), track([0x81, 0x80, 0x80, 0x80, 0x00, 0x90, 0x3c, 0x64])),
      /a variable-length quantity over 4 bytes, at byte 22/,
    ],
  ];
  for (const [bytes, refusal] of malformed) {
    assert.throws(() => decodeMidiFile(bytes), refusal, String(refusal));
  }
});

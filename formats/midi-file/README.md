# formats/midi-file

Standard MIDI Files read and written: a file's bytes from its tracks of notes and controllers, its tempo map and its time signatures, and back. Pure: bytes in, bytes out, reading and writing the file is the caller's. Time is in ticks, the file's ppq to a quarter note; a note is its start and length, not a note on and a note off. A file read is an edge: anything malformed is refused with what is wrong and at which byte.

Depends on: nothing.

```ts
import { decodeMidiFile, encodeMidiFile, type MidiFile } from './index.ts';

const file: MidiFile = {
  format: 1,
  ppq: 480,
  tracks: [{ notes: [{ tick: 0, duration: 240, pitch: 60, velocity: 100, channel: 0 }], controllers: [] }],
  tempos: [{ tick: 0, microsecondsPerQuarter: 500000 }], // 120 bpm
  timeSignatures: [{ tick: 0, numerator: 7, denominator: 8 }],
};
const bytes = encodeMidiFile(file); // a Uint8Array, for the caller to save
decodeMidiFile(bytes); // the same file again
```

How it writes and reads:

1. A note is written as a note on and a note off, 0x80 with the release velocity 64. At one tick the tempo and time signature come first, then notes let go, then controllers, then notes begun.
2. The tempo map and time signatures are the whole file's, written into the first track. Read, they're gathered from every track, in time order.
3. Read, running status repeats the last channel message's status, and a note on of velocity 0 lets a note go. Each note off lets go the earliest note held on its pitch and channel, and a note never let go ends with its track.
4. Read past safely: other channel messages, sysex, other meta events, chunks of other types. Refused: format 2, ticks by SMPTE frames, a file cut short, a data byte where a status is due and the reverse, and a tempo or time signature of the wrong length.

| Export | What it does |
|---|---|
| `encodeMidiFile()` | A file's bytes (`Uint8Array`) from a `MidiFile`, format 0 or 1, delta times as variable-length quantities. A value that doesn't fit its field is refused, saying which track and event (`encode.ts`). |
| `decodeMidiFile()` | A `MidiFile` from a file's bytes, format 0 or 1, its notes paired into starts and lengths. A malformed file is refused, saying what and at which byte (`decode.ts`). |
| `MidiFile`, `MidiTrack` | A file: its `format`, its `ppq`, its `tracks`, each its `notes` and `controllers`, and its `tempos` and `timeSignatures` (`tracks.ts`). |
| `MidiNote`, `ControllerChange` | A note: its `tick`, `duration`, `pitch`, `velocity` 1 to 127 and `channel` 0 to 15. A controller's change: its `tick`, `controller`, `value` and `channel` (`tracks.ts`). |
| `TempoChange`, `TimeSignatureChange` | A tempo from a tick on, in `microsecondsPerQuarter`, 60 000 000 / bpm; a time signature from a tick on, its `numerator` and `denominator`, 8 for 7/8 (`tracks.ts`). |

Tests: `test/encode.test.js`, known bytes, the standard's variable-length table, the order at one tick and the refusals; `test/decode.test.js`, known bytes, round trips, running status, notes overlapping on one pitch, what's skipped, a file cut short at every length and malformed files. `test/midi-bytes.js` builds a file's bytes by hand.

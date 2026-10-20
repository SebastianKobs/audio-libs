# midi

MIDI 2.0's channel voice messages as values, the protocol alone, as a synth and a sequencer share it and nothing else: the messages, the notes among them, each note a fresh index, and what they're played into. So an instrument speaks MIDI without a sequencer, it stands alone, on the clock's `Seconds` and `libs/automation/`'s `TimedValue`. Pure: no Web Audio; its tests in its `test/` folder. Why the messages are MIDI 2.0's: `mockup/architecture/sequencer.md`.

```ts
import { NoteRotation, notesIn, type Receiver } from './index.ts';
const rotation = new NoteRotation();
const index = rotation.noteOn();                                            // a fresh index for the note
const synth: Receiver = { receive: (messages) => play(notesIn(messages)) };  // an instrument, or a track
synth.receive([
  { type: 'note on', index, pitch: 62, velocity: 1, t },
  { type: 'per-note controller', index, controller: 'volume', value: 0.4, t },   // how it's heard as it starts
  { type: 'note off', index, t: t + sixteenth },                              // its length known as it starts: sent with it
]);
```

| | |
|---|---|
| `Message`, `Controller`, `PerNoteControllerName`, `PerNoteValues`, `NoteToSend`, `SentNote`, `NoteOn`, `NoteOff`, `PerNoteController`, `PerNoteManagement`, `notesIn(messages)`, `noteMessages(note, index, valuesAt)`, `retimed(messages, at)` | every message a union (`Message`); a track's controller by its name (`Controller`); a note's per-note controllers by name, and their values (`PerNoteControllerName`, `PerNoteValues`); a note to send (`NoteToSend`); a note as its messages give it (`SentNote`). Messages on another clock, each one's time moved by its own, as an instrument on an audio context takes a sequencer's; a note's messages built once, the inverse of `notesIn()`: its note on, its per-note controllers as it starts, its glides as #3 Pitch 7.25, its note off where its length is known; a control surface's, a clip's, a test note's and what plays back all sent so. Then the messages, MIDI 2.0's channel voice messages as values, not its packets: a note on, `{ index, pitch, velocity, t, part }`, a velocity 0 to 1; a note off, `{ index, t }`, sent with its note on where its length is known as it starts; a per-note controller, `{ index, controller, value, t }`, a registered one by its name and in its own units, `volume` (#7) a gain, `pan` (#10), `brightness` (#74) a cutoff in Hz, `effects 1 depth` (#91) a reverb send's gain, `vibrato depth` (#77) in cents, `vibrato rate` (#76) in Hz, `breath` (#2) from 0 to 1, `decay time` (#75) in seconds (checked against M2-104-UM's Table 11), `pitch` (#3 Pitch 7.25) a MIDI note number, a held note's glide at its time, or an assignable one by its name, a note's own value, `rise` in seconds, sent with its note on its value as it starts, later a change; per-note management, `{ index, detach: true, t }`, its per-note controllers detached once it has rung out; a controller, `{ controller, value, t, glide }`, a track's parameter by its name, mapped by its instrument, in its units. A controller's change, a per-note one's too, carries how it moves there, as an automation point's curve: jumping at its time, or gliding from it by a time constant (`glide`): `libs/automation/`'s `TimedValue`, a lane's point too. The notes among them, each with its length where its note off came with it, and its per-note controllers sent with it. The other kinds come with the steps that first send them |
| `new NoteRotation()` (`rotation.ts`), `noteOn()`, `noteOff(index)` | a source's notes, each a fresh index, as MIDI 2.0's note rotation hands them out: in turn round the 128 note numbers, one still on passed over, so two notes of one pitch keep apart |
| `Receiver` (`receiver.ts`), `receive(messages)` | what messages are played into, at once, each at its own clock time: an instrument, as a synth's MIDI in takes a keyboard's or a sequencer's, or a track, the sequencer's (`libs/midi-sequencer/`, `Track`); Java Sound's name for it |

Tested in node, in its `test/` folder (`midi.test.js`).

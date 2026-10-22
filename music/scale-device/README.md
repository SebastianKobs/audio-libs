# scale-device

The Scale device: a MIDI insert, as a delay is an insert on audio. It sits on a track's way in, and maps each note from the key its notes arrive in into the key chosen, a step of one key into the same step of another. It imports the MIDI protocol (`sequencing/midi/`), the key and its scales (`music/music-theory/`) and a param's spec (`base/params/`); its tests the shared `near()` (`base/util/`).

| | |
|---|---|
| `new ScaleDevice({ keys, start, from, into })`, `ScaleDeviceSetup` | the device: `keys` its keys by name, `start` the name it starts in, `from` the key its notes arrive in, `into` the receiver it plays into (`scale-device.ts`) |
| `receive(messages)` | a `Receiver`: a note on's pitch moved into the key chosen; a per-note `pitch` controller, a glide, moved by its note's shift; a `key` controller sets the key for the notes after it in its batch and isn't passed on; every other message passed on unchanged (`scale-device.ts`) |
| `spec` | the key as a param's spec: its name `key`, its choices the keys' names, its default the one it starts in (`base/params/`) |
| `keySpec(keys, start)` | that spec without a device, so the app declares the key before the first note (`scale-device.ts`) |
| `shiftInto(pitch, from, into)` | how far a pitch moves: the step below it, in each key, differ by this; a pitch outside its key moves with the step under it (`steps.ts`) |

A note's shift is kept by its index from its note on, and forgotten at its per-note management (detach), as the instrument keeps its voices. A pitch is matched to a step within a tolerance of a millionth of a semitone, as Stimmung's steps aren't whole semitones.

Tested in node (`test/scale-device.test.js`): every pair of the moods' keys, two octaves either side of the scale; the key chosen from the next note on; a glide moved by its own note's shift; a pitch between steps; the rest passed unchanged.

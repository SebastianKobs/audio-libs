# midi-devices/scale

The Scale device: a MIDI insert, as a delay is an insert on audio. It sits on a track's way in and maps each note from the key its notes arrive in into the key chosen, a step of one key into the same step of another.

Depends on: `base/params`, `base/util`, `midi/protocol`, `music/music-theory`.

```ts
import { ScaleDevice, type Receiver } from './index.ts';
import { SCALES } from '../../music/music-theory/index.ts';

const keys = { major: { root: 60, scale: SCALES.major }, minor: { root: 60, scale: SCALES.minor } };
const into: Receiver = { receive: (messages) => console.log(messages) };
const device = new ScaleDevice({ keys, start: 'minor', from: keys.major, into });
device.receive([{ type: 'note on', index: 0, pitch: 64, velocity: 1, t: 0 }]); // E arrives: pitch 63 goes on, E flat
device.receive([{ type: 'controller', controller: 'key', value: 0, t: 1 }]); // the key chosen: major, from the next note on
```

How it passes messages, in their order:

1. A `key` controller sets the key for the notes after it in its batch and isn't passed on.
2. A note on's pitch is moved into the key chosen, its shift kept by its index from its note on until its per-note management (detach), as the instrument keeps its voices.
3. A per-note `pitch` controller, a glide, is moved by its note's shift.
4. Every other message is passed on unchanged.

A pitch is matched to a step within a tolerance of a millionth of a semitone, as a tuning's steps need not be whole semitones. A pitch outside its key moves with the step under it, so a glide keeps its place between steps.

| Export | What it does |
|---|---|
| `new ScaleDevice({ keys, start, from, into })`: `receive()`, `spec` | A `Receiver` around the one it plays into. `keys` are its keys by name, `start` the name it starts in, `from` the key its notes arrive in, `into` the receiver it plays into. `spec` is the key as a param's spec: the name `key`, its choices the keys' names (`scale-device.ts`). |
| `ScaleDeviceSetup` | What the device is handed: `keys`, `start`, `from` and `into` (`scale-device.ts`). |
| `keySpec()` | That spec without a device, so the app declares the key before the first note (`scale-device.ts`). |

Tests: `test/scale-device.test.js`, every pair of keys, two octaves either side of the scale; the key chosen from the next note on; a glide moved by its own note's shift; a pitch between steps; the rest passed unchanged.

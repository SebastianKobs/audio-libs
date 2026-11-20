# dsp/oscillators

Oscillator voices rendered sample by sample, free of any audio API, and the one way to start and stop them. A voice writes frames of an output array at its params, each a number for the block or an array a sample each: `SyncVoice` is a hard-synced oscillator (a slave a number of semitones above a master, reset at each turn of the master's, a polyBLEP smoothing every jump so it doesn't alias), `OperatorVoice` is phase modulation between up to four operators (a modulator shifts a carrier's phase, so the pitch holds as the brightness moves; one operator may feed itself; eight waves, eight algorithms in `OPERATOR_ALGORITHMS`) and `PhaseDistortionVoice` is one line of a Casio CZ (a cosine read through a phase bent at a knee, a saw or a square, from a sine at a dcw of 0 to a bright shape at 1). A `ScheduledVoice` makes any of them a source: told `{ start }` and `{ stop }` in seconds, silent before the one and after the other, and asking to be let go once stopped. The algorithms are from memory of the DX21's chart, to be checked against the TX81Z's manual.

Depends on: nothing.

```ts
import { OPERATOR_ALGORITHMS, OperatorVoice, ScheduledVoice, SyncVoice } from './index.ts';

const out = new Float32Array(128);
new SyncVoice().render(out, 0, 128, { frequency: 220, detune: 0, sync: 7, wave: 0 }, 48000); // a saw synced 7 semitones up

const { routes, carriers } = OPERATOR_ALGORITHMS[1]; // algorithm 2
const bell = new OperatorVoice({ routes, carriers });
bell.render(out, 0, 128, { frequency: 220, feedback: 0, ratio1: 1, level1: 1, ratio2: 2, level2: 2 }, 48000); // a param left out reads 0

const source = new ScheduledVoice(new SyncVoice());
source.told({ start: 1 }); // from 1 s on the context's clock
source.process([[out]], { frequency: 220 }, { sampleRate: 48000, currentTime: 0.99 }); // true: keep it; false once stopped
```

| Export | What it does |
|---|---|
| `SyncVoice` | A master at the note and a slave `sync` semitones above it, the slave's sawtooth or square heard, a sample late for the polyBLEP; reads `frequency`, `detune`, `sync` and `wave` (`sync-voice.ts`). |
| `OperatorVoice`, `OperatorSetup` | Four phase-modulation operators made from their `routes`, `carriers`, the operator that feeds itself and their start phases (handed in, so no random is drawn here); reads `frequency`, `detune`, `feedback` and each operator's `ratio`, `detune`, `level` and `wave` by its number; throws for a route that doesn't come from a higher operator (`operator-voice.ts`). |
| `OPERATOR_ALGORITHMS`, `OperatorAlgorithm` | The eight algorithms by their number less one: the operators that modulate each operator, and the operators heard (`operator-algorithms.ts`). |
| `PhaseDistortionVoice`, `PhaseDistortionSetup` | One line of a CZ, from a start phase; reads `frequency`, `detune`, `dcw` and `wave` (`phase-distortion-voice.ts`). |
| `ScheduledVoice`, `BlockClock` | A voice told when to start and stop: `told(message)` takes `{ start }` and `{ stop }` in seconds, a message that isn't a time left out, a stop never taken back; `process()` renders a block of the first output and copies it to every channel, false once the voice has stopped (`scheduled-voice.ts`). |
| `Voice`, `VoiceParams` | What a voice is: `render(out, from, to, params, sampleRate)` writing frames `from` to `to`; and what its params are, each a number or an array a sample each (`voice.ts`). |

Tests: `test/sync-voice.test.js`, the saw's turns, the master's pitch held as the sync rises, the square, and params a sample each; `test/operator-voice.test.js`, a sine, the Bessel sidebands of a pair, feedback, routing, the waves' partials, the eight algorithms and a level in a line; `test/phase-distortion-voice.test.js`, a sine at no dcw, the saw's and the square's partials as the dcw rises, the pitch held, and a dcw in a line; `test/scheduled-voice.test.js`, silent until its start, sounding from that frame, let go once stopped, its channels and its refused messages.

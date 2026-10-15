# plan/blocks

The building blocks: nodes with no inside, declared. The contract every builder meets: each one built, or a placeholder put in, its audio passed straight through, a source silent. Kept small and fixed. A package of its own since LAY6a, beside `plan/format/`.

Each block declares its kind, its inputs and outputs, and its params and settings as `libs/params/` declares a param, in short standard terms. A param is edited or automated as it plays; a setting is chosen as it's built, a change a rebuild.

| Kind | Params | Settings | In, out |
|---|---|---|---|
| `oscillator` | frequency (Hz, by octaves), detune (cents) | wave: sine, triangle, square, sawtooth | none; out, mono |
| `gain` | gain, a share | | in; out |
| `filter` | frequency (Hz, by octaves, wide open to start), resonance (Q, a plain ratio, 0.707 flat) | type: lowpass, highpass, bandpass | in; out |
| `pan` | pan | law: stereo, pan pot | in; out, stereo |
| `delay` | sync, note, ms: a time with a sync switch (`libs/params/`'s `timeSpecs()`) | longest (s) | in; out |
| `reverb` | | length (s) | in; out, stereo |
| `noise` | | colour: noise, breath | none; out, mono |
| `limiter` | gain (dB), ceiling (dBFS), release (s) | | in; out |
| `envelope` | gate, a switch; delay, attack, hold, decay, release (s); sustain; amount | | none; out, mono |

An input's or an output's channels are given where the block fixes them; elsewhere they're as they come, the plan's node saying.

| | |
|---|---|
| `Block`, `Jack` | a block: its kind, its inputs and outputs, each a jack, its name and its channels where the block fixes them; its params' and its settings' specs (`block.ts`) |
| `BLOCKS`, `BlockKind` | every block by its kind, frozen all the way down: the list each builder checks itself against (`blocks.ts`) |
| `DELAY_TIME` | a delay's time, its three params, synced to an 8th to start, free up to 4 s; the synth's delay and the tool's FX channels on it (`delay.ts`) |
| `ENVELOPE_SPECS` | an envelope's knobs by name, its amount in its target's units, its stages' times, its sustain; the synth's envelopes on it (`envelope.ts`) |
| `LIMITER_SPECS` | a limiter's gain, ceiling and release; the synth's limiter and the Limiter insert on it (`limiter.ts`) |
| `WAVE`, `DETUNE` | an oscillator's wave and its detune; the synth's oscillators on them (`oscillator.ts`) |
| `RESONANCE` | a filter's resonance, Q as a plain ratio, as an EQ shows it, 0.707 flat (Butterworth), more a bump at the cutoff; the Filter insert's (`filter.ts`) |
| `REVERB_LENGTH` | how long a reverb's tail is; the synth's reverb on it (`reverb.ts`) |
| `envelopeStages(times, target, continuous)`, `envelopeRelease(release, target, { from, stages })`, `EnvelopeTimes`, `EnvelopeTarget`, `EnvelopeStage` | how an envelope moves, as automation, for a builder that builds it as a curve: its stages from its gate opening, after its delay up over its attack, held over its hold, down to its sustain over its decay, a stage with no time set at once, with no delay and no attack at its top at once; its release from its gate closing, from where its stages have it, a ramp running then cut there at the level it has reached, down to 0, and when it has faded; on numbers its caller resolved, its target saying what a point of the curve is there and the ramp each stage takes; the synth's stages on it (`envelope-curve.ts`, LAY6b) |

Tested in node, in its `test/` folder: the nine blocks by their kinds; every param and setting on a control, a range or choices, a default declared inside it, its name one of a kind, an input's and an output's too; what each declares, in short standard terms, its channels where it fixes them; its settings' choices (`test/blocks.test.js`); an envelope's curve, its stages, the short ways and its release (`test/envelope-curve.test.js`).

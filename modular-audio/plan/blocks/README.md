# plan/blocks

The building blocks: nodes with no inside, declared. The contract every builder meets: each one built, or a placeholder put in, its audio passed straight through, a source silent. Kept small and fixed, beside `plan/format/`. It imports `libs/base/util/`, `libs/base/params/`, `libs/base/automation/` and `plan/format/`.

Each block declares its kind, its inputs and outputs, and its params and settings as `libs/base/params/` declares a param, in short standard terms. A param is edited or automated as it plays; a setting is chosen as it's built, a change a rebuild.

| Kind | Params | Settings | In, out |
|---|---|---|---|
| `oscillator` | sync, note, frequency: its rate a time with a sync switch, free its frequency in Hz down to an LFO's; detune (cents, four octaves either way); stop (s from the note's start, 0 none) | wave: sine, triangle, square, sawtooth; phase: reset with each note, or free | none; out, mono |
| `gain` | gain, a share, shown in dB by the fader law | | in; out |
| `filter` | frequency (Hz, by octaves, wide open to start), resonance (Q, a plain ratio, 0.707 flat), detune (cents, a sweep or an offset from the keys) | type: lowpass, highpass, bandpass; slope: 12 or 24 dB an octave | in; out |
| `pan` | pan | law: stereo, pan pot | in; out, stereo |
| `delay` | sync, note, ms: a time with a sync switch (`libs/base/params/`'s `timeSpecs()`); a signal wired into its ms moves its line in seconds, as Web Audio's does | longest (s) | in; out |
| `reverb` | | length (s) | in; out, stereo |
| `noise` | offset (s, the furthest into its buffer it starts, drawn as its voice starts), stop | color: noise, breath; loop: off, on | none; out, mono |
| `limiter` | gain (dB), ceiling (dBFS), release (s) | | in; out |
| `envelope` | gate, a switch; delay, attack, hold, decay, release (s, 0.1 to start); sustain; amount | mode: the gate's, or a trigger's running on past the note-off, as Ableton's | none; out, mono |
| `select` | | input: a, b, the one passed on, the other going nowhere, as a console's PRE button picks where a send is taken | a, b; out |

An input's or an output's channels are given where the block fixes them; elsewhere they're as they come, the plan's node saying.

| | |
|---|---|
| `Block`, `Jack` | a block: its kind, its inputs and outputs, each a jack, its name and its channels where the block fixes them; its params' and its settings' specs; whether it sounds on after its input stops, a delay's echoes, a reverb's tail (`tail`) (`block.ts`) |
| `BLOCKS`, `BlockKind` | every block by its kind, frozen all the way down: the list each builder checks itself against (`blocks.ts`) |
| `DELAY_TIME` | a delay's time, its three params, synced to an 8th to start, free up to 4 s, its free time never glided, as its pitch would bend; a synth's delay and a desk's FX channels on it (`delay.ts`) |
| `ENVELOPE_SPECS` | an envelope's knobs by name, its amount in its target's units, its stages' times, its sustain; a synth's envelopes on it (`envelope.ts`) |
| `LIMITER_SPECS` | a limiter's gain, ceiling and release; a synth's limiter and the Limiter insert on it (`limiter.ts`) |
| `NOISE_SECONDS` | each noise color's buffer, as a builder that plays noise from a looping buffer makes it: a noise 2 s, a breath 0.2 s (`noise.ts`) |
| `WAVE`, `DETUNE`, `TUNE_DETUNE` | an oscillator's wave and its detune; a synth's oscillators on them; a detune wide enough for a voice card's tune, an oscillator's and a filter's (`oscillator.ts`) |
| `STOP` | a source's stop, in s from the note's start, 0 none (`block.ts`) |
| `FILTER_SLOPE`, `biquadQs({ type, resonance, slope })`, `FilterStages` | a filter's slope, 12 dB an octave or 24; its stages' Qs for a builder that builds it from biquads in series: at 12 one, at its resonance, none where it has none; at 24 two, a lowpass's or a highpass's a 4th-order Butterworth's (0.541, 1.307), flat at a resonance of 0.707, its second moved by the resonance, a bandpass's both at it; a synth's filters on it (`filter.ts`) |
| `RESONANCE` | a filter's resonance, Q as a plain ratio, as an EQ shows it, 0.707 flat (Butterworth), more a bump at the cutoff, by octaves; the Filter insert's, and a synth's `q` (`filter.ts`) |
| `REVERB_LENGTH` | how long a reverb's tail is; a synth's reverb on it (`reverb.ts`) |
| `envelopeStages(times, amount, continuous)`, `envelopeRelease(release, { from, stages })`, `envelopeCurve(times, amount, { opened, closed, release })`, `EnvelopeTimes`, `CHARGED`, `DONE` | how an envelope moves, as automation, an ARP's, every stage an RC curve done at its time: its stages from its gate opening, after its delay up over its attack, charging toward 1.3 times its peak and cut there at its time, as a comparator cuts it, held over its hold, down to its sustain over its decay, approaching it, within the floor of silence of it at its time, a time constant a ninth of it, never set there, so one drawn again never jumps (`CHARGED` and `DONE`, the time constants an attack and a decay or release take, for a test of any builder's curve); a stage with no time set at once, with no delay and no attack at its top at once; its release from its gate closing, from where its stages have it, a stage running then cut there, down to 0 the same way, and when it has faded; on numbers its caller resolved, its amount in its target's units; its whole curve from its gate opening at a time, released where its gate has closed (`envelope-curve.ts`) |

Tested in node, in its `test/` folder: the ten blocks by their kinds; every param and setting on a control, a range or choices, a default declared inside it, its name one of a kind, an input's and an output's too; what each declares, in short standard terms, its channels where it fixes them; its choices, units and defaults, and the rules beside them; a filter's stages' Qs at either slope (`test/blocks.test.js`); an envelope's curve, its stages, the short ways and its release; its curve's three shapes, its stages to their target, its whole curve from a gate at a time (`test/envelope-curve.test.js`).

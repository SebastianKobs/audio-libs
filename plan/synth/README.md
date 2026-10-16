# plan/synth

The synth's templates and forms, a package of its own since LAY13a: a voice card, an architecture, made of modules, each a YAML file, its comments the reasons, a module named as it is on a synth's panel and never as a block is (LAY13a2); the note's sources the voice card's macros. Handed to the planner (`libs/plan/planner/`) with its forms; a patch is a preset on an architecture (LAY13c).

```ts
import { MODULE_TEMPLATES, SYNTH_FORMS } from './index.ts';
import { Planner } from '../planner/index.ts';
const planner = new Planner([...MODULE_TEMPLATES, pluck], SYNTH_FORMS);
planner.plan('Pluck', { values: { 'osc 1/tune': 24 } });   // a voice card, an octave and a fifth up
```

A voice card is wired as a hardware synth's: its sources into its chain's stages, the stages into its one output, its modulators into the params of any module, a module's macro among them, as Ableton's macros take modulation. What multiplies is a gain in series, as a modular's VCAs: an FM's index after a gain the note's frequency sets, an envelope's velocity after the envelope, an LFO's depth as a share of the note's frequency through its scale. A ratio to the note is a tune in semitones, onto a detune in cents, as pitch adds where ratios multiply.

| Module | Its job | Inside | Its macros | Its settings |
|---|---|---|---|---|
| `VCO` | source | an oscillator into its level | frequency, the note's; tune (semitones, onto its detune); level; stop | `osc/wave` |
| `Noise source` | source | a noise through a filter into its level | level; cutoff, resonance; tune (onto the filter's detune, an offset from the keys); offset; stop | `noise/colour`, `noise/loop`, `filter/type`, `filter/slope` |
| `LFO` | modulator | an oscillator into its depth into a scale | sync, note, hz, its oscillator's rate; depth, in its target's units; scale, 1, or the note's frequency | `osc/wave`, `osc/phase` |
| `FM` | modulator | an oscillator into a scale, the note's frequency, into its index | frequency; tune, its ratio; scale; index; stop | `osc/wave` |
| `Envelope generator` | modulator | an envelope into a gain its note's velocity sets | gate, the note's; delay, attack, hold, decay, sustain, release; amount, in its target's units; velocity | `envelope/curve`, `envelope/mode` |
| `VCA` | stage | a gain an envelope moves into its level | gain, open at 1, at 0 where an envelope opens it; level | |
| `VCF` | stage | a filter | cutoff, resonance; tune (onto its detune, a sweep in semitones, an offset from the keys) | `filter/type`, `filter/slope` |
| `Tremolo` | stage | a gain an LFO moves | gain | |
| `Ring` | stage | the sound into a gain at 0, an oscillator moving it | frequency; tune; stop | `osc/wave` |
| `Out` | output | its volume | volume | |

| | |
|---|---|
| `NOTE_SOURCES`, `NoteSource` | a note's sources into a voice, as a voice card's CV, each a param's spec: frequency, gate, velocity, bend, and the per-note controllers by MIDI's names where it has them, vibrato depth and rate, breath, decay time, rise; at its default where a note sends none (`note.ts`) |
| `NOTE_SETTINGS` | the note's settings: the time constant a later pitch glides by, its shortest, its longest (`note.ts`) |
| `ARCHITECTURE_FORM` | what a voice card is: sources, modulators, stages and its one output, by role; sources into stages or out, stages into the next or out, the output out of the card, modulators into params of any role; no loops, every way out ending in its output (`architecture-form.ts`) |
| `SOURCE_FORM`, `MODULATOR_FORM`, `STAGE_FORM`, `OUTPUT_FORM`, `SYNTH_FORMS` | a module's form by its job, its jacks; the synth's forms, the architecture's then its modules' (`architecture-form.ts`) |
| `MODULE_TEMPLATES` | the ten, read from their YAML as the app is built, each checked for its shape as it loads (`templateOf()`), frozen (`index.ts`) |

Tested in node, in its `test/` folder: the note's sources on their controls; the modules, each of its form, its macros by name, a tune onto a detune; a voice card of the architecture's form, and one refused where it breaks it, every failure said.

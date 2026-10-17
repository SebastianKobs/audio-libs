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
| `Out` | output | its volume, then the note's own (MIDI 2.0's per-note #7, LAY14a5b) | volume, note volume | |

| | |
|---|---|
| `NOTE_SOURCES`, `NoteSource` | a note's sources into a voice, as a voice card's CV, each a param's spec: frequency, gate, velocity, its volume (#7, a held note hushed, LAY14a5b), bend, and the per-note controllers by MIDI's names where it has them, vibrato depth and rate, breath, decay time, rise; at its default where a note sends none (`note.ts`) |
| `NOTE_SETTINGS` | the note's settings: the time constant a later pitch glides by, its shortest, its longest, 0 none, a held note sounding until its note off (LAY14a5b) (`note.ts`) |
| `ARCHITECTURE_FORM` | what a voice card is: sources, modulators, stages and its one output, by role; sources into stages or out, stages into the next or out, the output out of the card, modulators into params of any role; no loops, every way out ending in its output (`architecture-form.ts`) |
| `SOURCE_FORM`, `MODULATOR_FORM`, `STAGE_FORM`, `OUTPUT_FORM`, `SYNTH_FORMS` | a module's form by its job, its jacks; the synth's forms, the architecture's then its modules' (`architecture-form.ts`) |
| `INSTRUMENT_FORM` | an instrument's form: its voices, each of the architecture's form, each into its one output (`architecture-form.ts`, LAY13b) |
| `instrumentOf(kind, chains, architectures)`, `Chain` | an instrument's template: one chain with no key, a pool of voices, each a copy of its voice card, the patch's preset on its architecture; each chain with its key, a drum rack, a pool for each pad, played by its key; the note's sources into the voice card's macros of their names; two chains with no key, a key twice, an architecture not handed in refused (`instrument.ts`, LAY13b) |
| `changesFrom(before, after, architecture)`, `Changes` | a preset changed on the same architecture: each value and setting that differs, by its address, one let go back to the architecture's start; another architecture refused, another instrument (`preset.ts`, LAY13b) |
| `instrumentsOf(data, source)`, `Instruments`, `RackPad` | a file of instruments read, as a person writes it (a theme's `instruments.yaml`): the instruments by their names, each its voice card's children, wires and macros, made templates of a voice card's form, its name its kind, one mono output; the patches by names of their own, each the instrument it plays (`instrument:`), made presets, the instrument their kind, read as every preset file is (`presetsOf()`, LAY13f); the racks, each pad a key and a patch; its shape checked as it loads, every failure under the file's name, a pad naming a patch the file hasn't refused (`instruments-file.ts`, LAY13e) |
| `Bank` | patches by name, in order, as a synth's bank holds its programs; a program change picks one by its place, from 0 (`bank.ts`, LAY13b) |
| `MODULE_TEMPLATES` | the ten, read from their YAML as the app is built, each checked for its shape as it loads (`templateOf()`), frozen (`modules.ts`, out of `index.ts` in SHAPE1a) |
| `cardPlanner(templates)` | the planner of voice cards: the modules' templates and those given, a file's own (`patch-plans.ts`, SHAPE1a) |
| `patchPlan(name, instruments)`, `chainsOf(instruments, name)` | a patch's instrument planned from a file of instruments, by its name: a pool of voices of its voice card, or a drum rack, a pool for each pad; its chains, the patch alone or its rack's pads, each its key (`patch-plans.ts`, SHAPE1a) |

Tested in node, in its `test/` folder, on the tests' voice card and file of instruments (`pluck.js`): the note's sources on their controls; the modules, each of its form, its macros by name, a tune onto a detune; a voice card of the architecture's form, and one refused where it breaks it, every failure said; an instrument of one patch and a drum rack, and one refused; a preset's changes; a bank; a file of instruments read, and one refused; a patch planned from a file by its name, its chains, the planner of its voice cards (`test/patch-plans.test.js`).

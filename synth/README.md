# synth

The synth. A **patch** and a **note** in; the graph the note needs out, as data: a **plan**, an audio plan (`libs/audio-plan/`) with what a voice adds. A package of its own since W4, moved out of `sound/`, on the clock, the music theory and the audio plan. No Web Audio: an engine builds the plan (`Engine.build()`, `libs/web-audio-engine/`).

```ts
import { plan } from './index.ts';
const p = plan(patch, { pitch: 62, velocity: 1 }, { random: Math.random }, { decay: 1.4 });   // patch, note, its context, params
// p.nodes, p.edges: what to build; p.ports: its ports, by name
// p.controls, for any note: set(port, value, at, tc) moves a port while it sounds; release(at) lets go of it, its note-off: each
// envelope's release from then (a note with a length is released at its end, in its plan, its sources with no stop written stopped once
// it has faded, G0c2), each source stopped where what gates it fades then, at the latest as the last release fades; a stop written cut
// then, never moved later (G0i2). A held note, with no length, sounds until it's let go, a patch's longest clamping only a length (G0i2).
// No stop written, a source stops once whatever gates it has faded (G0.3): its own gain's envelope where that fades to nothing, else
// what it feeds, the VCA, a ring; an FM modulator and an LFO with the sound they move
// p.handle: glide(pitch, at), tempo(beat, at), where the patch has them
```

## Files

| File | Holds |
|---|---|
| `index.ts` | `plan(patch, note, params, blocks)`: walks a patch, hands each part to its block; `BLOCKS`; `paramOf(path)`, a value's param by its path in a patch; `envelopeEvents(patch, index, note, context, params)`, an envelope's automation for a note in its own terms and its delay, for a surface to draw (I1g3, I1h3); `amountSpec(target)`, an envelope's amount as its cable draws it, its unit and range by its target's kind; `mappingOf()` and `termOf()`, a term as its mapping and back (`mappings.ts`, I1i1); `valuesOf(patch, note, context, params)`, what a term reads for a note, as a surface shows it for its test note (I1i2); `noteValuesRead(patch)`, the note's own values a patch reads, a term, a value or a condition naming them (I1i3); `padsOf(patch)`, the note numbers its conditions name, a drum rack's pads, so a surface plans a note at each (G0.2c) |
| `plan.ts` | a note's plan, as data: an audio plan, its nodes, their values and automation, its edges, what the engine builds, an envelope only as its automation (I1g1), with what a voice adds, its ports, handle and controls (W2a). The audio plan, an edit followed as it sounds (`followEdit()`) and a fade through a gain are a package of their own since W2c (`libs/audio-plan/`); its automation as Web Audio plays it (`levelAt()`) `libs/automation/`'s since LAY1 |
| `plan-builder.ts` | the builder a block plans into: nodes, values and automation, edges, ports, the handle; `Block`, how a block plans into it |
| `values.ts` | the note (`Note`: `pitch`, `velocity`, `duration`, `pitchBend`, `pitchGlides`, `vibrato`, a role's `held` and `rise`, named as the DAWs name a note's), its context (`beat`, `random`; no key, a voice getting its pitch, G0.1d) and a device's params; times (seconds, `'0.35 duration'`, `'2 rise'`, `'duration in 0.1..0.5'`, note values `'1/8'`, `'1/4.'`, `'1/8t'`, or a param that holds one), a note value told from other times (`isNoteValue()`), conditions, values that depend on the note or are drawn between two (`{ between: [0.35, 0.65] }`), a value by name, with a factor, a range and an offset as a time's (`'0.5 vibrato'`, I1i2), frequencies |
| `patch.ts` | what a patch is, as data: its blocks' specs (`Osc`, `Envelope`, its shape and its amount, `Filter`, …), its handle, and how a value can depend on the note (`Valued`, values.ts): the format a theme writes, and another engine reads |
| `mappings.ts` | a term as a mapping, as a rack's macro is mapped to a knob (I1i1): one source by name, a macro or a note's value, its factor, the range it's held in, its offset (`Mapping`); read from a term (`mappingOf()`, none for a note value or two sources) and written back as one (`termOf()`); its value for a note's values (`mappedValue()`, I1i2), mapped as a macro's onto a target (`libs/plan/format/`'s `mapOnto()`, LAY5b) |
| `params.ts` | every module's params, as a plugin describes its own, apart from any view (I1a): `ParamSpec`, each one's name, unit, range and step, choices, default, whether it's a gain shown in dB; a point's and a filter's values, which several blocks share (an envelope's, the limiter's, the delay's time, an oscillator's wave and detune, a reverb's length the building blocks', `libs/plan/blocks/`, LAY6a), a term's mapping's factor (`MAPPING_SPECS`, I1i2), a note's own values a term can name, its length, rise, vibrato and bend (`PER_NOTE_SPECS`, I1i3), and the patch's own until they're blocks' (`PATCH_SPECS`); a value's found by its path (`specAt()`) |
| `stages.ts` | an envelope's shape as automation on its target (I1h): from 0, after its delay up to 1 over its attack, held over its hold, down to its sustain over its decay, held until the note-off; from there, from where it is then, down over its release, or with none ringing on, a stage still running cut at the note-off at the level it has reached, so it runs up to it, not dropped (I1i3); with no delay and no attack from 1 |
| `shapes.ts` | an envelope as automation on what it moves (I1h): its shape (`stages.ts`), its amount in its target's units, the port's kind by its param: a gain its level times the amount and the shape, times the note's velocity unless it says not, from where it rests (FM's index), its attack straight, its decay and release exponential; a pitch or a cutoff in semitones from its own, straight in them; anything else added, straight. Its release at the note's end in its plan, or when it's let go (`released()`) |
| `fades.ts` | a voice crossfaded as it's rebuilt (G0.2b): `fadeOut()` and `fadeIn()`, through its out, the gain every instrument leaves by (W2a) |
| `blocks/` | one module for each block: `osc`, `lfo`, `envelope` (and its presets for patches, each its shape: `perc()`, `adsr()`, `swell()`, `stage()`), `fm`, `ring`, `noise`, the chain's stages `vca` (a gain its envelope moves, then its level, a gain of its own, I1e), `filter`, `tremolo`, `note` (where the note comes in), `gain`, `pan` (a stereo position, or written `{ position, mono: 'pan pot' }`, a mono sound panned as a console's pan pot, constant power, rather than up-mixed first as the mixer's pans are) and `limiter`, and an instrument's output, `out` (its `volume`, a gain built for every instrument, at 0 dB too); for an FX module, `delay` (a delay line, in at its delay, out from the lowpass in its loop; its time with a sync switch, three params, `sync`, `note` and `ms`, `DELAY_TIME`, following the tempo only while synced) and `reverb` (a convolver) |

## A block

```ts
export default {
  key: 'lfos', many: true,              // where a patch lists it: one, or a list
  paramSpecs: LFO_SPECS,                // its values' params (params.ts): name, unit, range, default
  plan(spec, builder, index, patch) {   // one entry of it, counting from 1, into the PlanBuilder
    const oscillator = builder.node('oscillator', 'lfo');
    const gain = builder.node('gain', 'lfo');
    // … values and automation: builder.value(), builder.automate()
    builder.link(oscillator, gain);     // within the block
    builder.into(gain, spec.target);    // into another block's port, made once every block has offered its own
  },
};
```

A block offers **ports**, names other blocks send their sound into or move: `'vca'`, `'filter'`, `'tremolo'`, `'ring 1'`, `'out'` (the patch's one output, mono), and params such as `'vca.gain'`, `'vca.level'`, `'out.volume'`, `'osc 1.gain'`, `'osc 1.detune'`, `'oscs.detune'`, `'filter.frequency'`, `'fm 1.gain'`, `'tremolo.gain'`, `'noise 1.gain'`. An LFO and an **envelope** are cabled to a param port (`target`), as on a modular synth; an envelope is written as automation on it. A sound with no `into` goes into the chain's first stage, or out. Connections are made last, so blocks can be planned in any order, and a new block is a new module added to `BLOCKS`.

## A patch

Its blocks (`oscs`, `lfos`, `envelopes`, `fm`, `ring`, `noise`; `vca`, `filter`, `tremolo` and the `chain`'s order). Each envelope is a block of its own in `envelopes`, cabled to the port it moves (`'vca.gain'`, `'osc 1.gain'`, `'oscs.frequency'`, `'filter.frequency'`, `'fm 1.gain'`), written as its shape, `delay`, `attack`, `hold`, `decay`, `sustain`, `release`, and its cable's `amount` in its target's units with its `velocity` switch (I1h), by the presets or as it is; the `vca` a gain its envelope moves, then its level (I1e). Its `note` block, where the note comes in (I1e): `transpose`, `glide` (a time constant), a note's `shortest` (a release before it waits for it) and `longest`, and `continuous` for a sound that runs on (the brushes', an FX module). Then its `params` with their defaults, `effect` for an FX module (`libs/web-audio-fx/`), whose chain's first stage is its input (the plan's `input`), and its `handle` (`glide`, `tempo`, and `when`). The note brings what varies with what's played: `pitch`, `velocity`, `duration`, `held`, `vibrato`, `pitchBend`, `pitchGlides`, `rise`; and beside it its context: `beat`, `random`. The garden's patches, with comments, are in each theme's `sound.ts` (`mockup/src/tool/themes/`).

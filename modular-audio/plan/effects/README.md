# modular-audio/plan/effects

The effects as templates: Utility, Filter, Limiter, Lookahead limiter, Delay, Tape delay, Reverb, Drive, Crusher, Chorus, Ducker, Grains, Align, EQ, Isolator, Compressor, Juno chorus, Tape echo, Hiss and Room, each a YAML file, its comments the reasons. The Tape delay is built on the Delay (`extends: Delay`), only its wobble written. Handed to the planner with their form; an owner's or a desk's presets are values and settings on them, by address.

Depends on: `base/automation`, `base/util`, `modular-audio/plan/blocks`, `modular-audio/plan/format`, `modular-audio/plan/planner`.

Its face, `index.ts`, is the form and what some effects are played with; the twenty templates are its content, `content.ts`, imported apart, so a desk's forms load no YAML.

```ts
import { EFFECT_FORM, chorusValues, duckEvents } from './index.ts';
import { EFFECT_TEMPLATES } from './content.ts';
import { Planner } from '../planner/index.ts';
const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);
planner.plan('Delay', { name: 'delay', values: { note: '1/4', feedback: 0.6, tone: 1600 } });
planner.plan('Utility', { name: 'utility', settings: { 'pan/law': 'pan pot' } });
planner.plan('Chorus', { name: 'chorus', values: chorusValues({ rate: 0.9 }) });
```

Each effect's params are macros by the names a desk keys them (`utility/level`, `delay/note`), so the recorded lanes keep their names. A macro writes no spec where its target has one: it takes its first target's under its own name.

An insert is an effect on a channel, a return or the master: the same device on any strip, as an Ableton audio effect is, exactly one kind of each. A device view draws every insert alike from its params, each in its own units, so an insert on any strip is the same module with its own values.

An insert's macros carry their hints, written in its template, and an effect is named by its label where it isn't its kind: the Filter as `LP filter`, the Tape delay as `Tape delay`, its own over the Delay's none.

| Effect | Inside | Its macros | Its settings |
|---|---|---|---|
| `Utility` | a gain into a pan | level, the gain's, the fader's in dB; pan | `pan/law`: stereo, or a pan pot |
| `Filter` | a filter | cutoff, the filter's frequency; q, its resonance, flat (0.707) to start | `filter/type`, `filter/slope` |
| `Limiter` | a limiter | gain 0 dB, ceiling -0.3 dBFS, release 0.3 s, Ableton's | |
| `Lookahead limiter` | a lookahead limiter | gain 0 dB, ceiling -1 dBTP, release 0.3 s, clip 3 dB | |
| `Delay` | a delay line into a lowpass, the lowpass back into the line through a gain | sync, note, ms, the line's; feedback and tone, their specs its own, feedback 0.45, tone 2400 Hz to start | `line/longest` |
| `TapeDelay` | the Delay's, and its wobble: a slow oscillator, its depth a gain, into the line's time by its ms, moving it in seconds | the Delay's; rate 0.5 Hz, depth 0.004 s, 4 ms either way | the Delay's |
| `Reverb` | a room | | `length`, its own, the room's (`room/length`) |
| `Drive` | a saturator after Decapitator's design: a low cut and a tilt before the curve, a saturation, a one pole (and two filters for a steeper cut) after it, the dry held back by a shaper lag as long as the oversampled curve holds the wet, mixed and trimmed | drive and punish into the knee, style, low cut, thump, tone, high cut, steep, auto, mix, output, oversample; at its start near as it came: no drive, smooth, open, all wet, at unity | |
| `Crusher` | a crusher mixed with the dry | bits, rate, mix; at its start a 12-bit sampler's, half wet | |
| `Chorus` | three short free delay lines moved by one LFO, each a third of its turn after the last, panned left, middle and right, mixed with the dry | rate, depth, spread, mix; `chorusValues()` plans its lags with a rate | |
| `Ducker` | a gain the kicks dip | level, 1 untouched; `duckEvents()` makes its automation from the kicks' times | |
| `Grains` | grains mixed with the dry | freeze, position, size, density, pitch, spray, mix; mostly dry at its start | |
| `Align` | a shaper lag | oversample, the oversampling of the Drives it waits for, 4x to start | |
| `EQ` | four bands in a row: a low cut, a low shelf, a peak, a high shelf | low cut, the three gains in dB, their frequencies, mid q; flat at its start | |
| `Isolator` | a DJ mixer's three-band kill, its crossovers Linkwitz-Riley | low, mid, high levels, 0 a kill; low split 200 Hz, high split 2500 Hz | |
| `Compressor` | a compressor block, its make-up taken back, a gain of its own | threshold, knee, ratio, attack, release, makeup | |
| `JunoChorus` | two free lines swept against each other by one triangle LFO, the wet added to the dry; its label `Juno chorus` | rate (`JUNO_CHORUS`'s I and II), depth, center, wet, dry | |
| `TapeEcho` | a delay line whose loop runs through a highpass, a lowpass and a soft clip, its time wandering with wow; its label `Tape echo` | the line's, feedback, tone, low cut, drive, wow, wow rate, rate, depth; `TAPE_GLIDE` | |
| `Hiss` | two looping noise sources panned hard apart into a level, the input passed on | level, 0.000548 at its start, -70 dBFS a side | |
| `Room` | a designed impulse through a convolver, then a level; its label `Room` | decay, pre delay, taps, dense, low decay, high decay, level; `PCM60` and `PCM60_DECAY` | |

| Export | What it does |
|---|---|
| `EFFECT_TEMPLATES` | The twenty, read from their YAML as `content.ts` loads, each checked for its shape as it loads (`templateOf()`) and frozen (`content.ts`). |
| `EFFECT_FORM` | What every effect is: one input and one output, its children free of roles (`form.ts`). |
| `duckEvents()`, `Ducking` | A Ducker's level as the kicks dip it: a glide down and back at each kick (`ducking.ts`). |
| `chorusLags()`, `chorusValues()` | A Chorus's second and third lags at a rate, a third and two thirds of its period; its values with them (`chorus.ts`). |
| `JUNO_CHORUS` | The Juno-60's two rates in Hz, I and II (`juno-chorus.ts`). |
| `TAPE_GLIDE` | The time constant a tape echo's time follows a new tempo by, in s (`tape-echo.ts`). |
| `PCM60`, `PCM60_DECAY` | The PCM-60's room and plate values, and its range of decay in s (`room.ts`). |

Tests: `test/effects.test.js`: every effect planned, its macros by the names a desk keys them, each at its default, the Utility's level the fader's in dB, each effect's label and its macros' hints, and the settings; the Drive's chain made of blocks, its controls onto it and its steep high cut's Qs; each other effect's chain of blocks and its macros onto it, and what some are played with.

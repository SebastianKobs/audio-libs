# plan/effects

The effects as templates, a package of its own since LAY9a: Utility, Filter, Limiter, Delay, Tape delay and Reverb, each a YAML file, its comments the reasons. The Tape delay is built on the Delay (`extends: Delay`), only its wobble written (LAY9b). Handed to the planner (`libs/plan/planner/`) with their form; a theme's or a desk's presets are values and settings on them, by address.

```ts
import { EFFECT_FORM, EFFECT_TEMPLATES } from './index.ts';
import { Planner } from '../planner/index.ts';
const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);
planner.plan('Delay', { name: 'delay', values: { note: '1/4', feedback: 0.6, tone: 1600 } });
planner.plan('Utility', { name: 'utility', settings: { 'pan/law': 'pan pot' } });
```

Each effect's params are macros by the names a desk keys them (`utility/level`, `delay/note`), so the recorded lanes keep their names. A macro writes no spec where its target has one: it takes its first target's under its own name.

A device shows an insert's macros with their hints, written in its template (LAY12e1), and an effect by its label where it isn't its kind (LAY12d1): the Filter as `LP filter`, the Tape delay as `Tape delay`, its own over the Delay's none.

| Effect | Inside | Its macros | Its settings |
|---|---|---|---|
| `Utility` | a gain into a pan | level, the gain's, the fader's in dB; pan | `pan/law`: stereo, or a pan pot |
| `Filter` | a filter | cutoff, the filter's frequency; q, its resonance, 1.085 | `filter/type`, `filter/slope` |
| `Limiter` | a limiter | gain 16 dB, ceiling -0.3 dBFS, release 0.3 s | |
| `Delay` | a delay line into a lowpass, the lowpass back into the line through a gain | sync, note, ms, the line's; feedback and tone, their specs its own, Glow's values to start | `line/longest` |
| `TapeDelay` | the Delay's, and its wobble: a slow oscillator, its depth a gain, into the line's time by its ms, moving it in seconds | the Delay's; rate 0.5 Hz, depth 0.004 s, 4 ms either way | the Delay's |
| `Reverb` | a room | | `room/length` |

| | |
|---|---|
| `EFFECT_TEMPLATES` | the six, read from their YAML as the app is built, each checked for its shape as it loads (`templateOf()`), frozen (`index.ts`) |
| `EFFECT_FORM` | what every effect is: one input and one output, its children free of roles (`form.ts`) |

Tested in node, in its `test/` folder: the six of the effect's form, planned, the Tape delay the Delay's and its wobble; their macros at today's names and values; a macro's spec its target's; the Delay's note a choice through its macro, the Utility's pan pot and the Reverb's length settings (`test/effects.test.js`). Each held to today's FX module, built on the stand-in, node for node, and each theme's effects as presets on them held to the theme's modules, in `mockup/test/unit/effect-templates.test.js`, which can reach the old libraries.

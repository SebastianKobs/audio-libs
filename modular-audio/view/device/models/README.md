# libs/modular-audio/view/device/models

A plan's devices as view models, with no DOM: handed a plan and its values through a plan's readout (`libs/modular-audio/view/device/readout/`), they hand back what a view shows of it and what it can do, as MVVM's view models do. It imports `libs/base/automation/`, `libs/base/params/`, `libs/modular-audio/plan/blocks/`, `libs/modular-audio/plan/format/`, `libs/base/util/` and that readout. Tested in node.

| Part | Holds |
|---|---|
| `model.ts` | `Model`: the plan and its values by address, read through the plan's readout (`PlanReadout`, `libs/modular-audio/view/device/readout/`): each value as it plays, the plan's where none was told; its start, which a reset brings back; how it's set (`Role`: live here, automated by what its track plays, fixed as built); a node's level as the implementation hears it, at one of its points where it has several, and a reading, a limiter's reduction; a pool's copies added so far; what's done sent as a command, through the send handed in, a message for the plan |
| `view-builder.ts` | `ViewBuilder`: view models for whatever part of a plan is asked: a param or a setting as a control (`control()`), a node as a device (`device()`), a composite's children grouped by their roles, in the order they first come (`groups()`); what a composite's own sources move, a row a target, as a mod matrix (`matrix()`, `MatrixRow`); a level and a reading by address, as the implementation hears them (`peakOf()`, `readingOf()`); a pool's copies (`copiesOf()`); the plan they're built from (`plan`) |
| `knob.ts` (`Ring`) | `Knob`: a param or a setting with a range as a control: its name, unit, range and taper its declared spec; its value, where it lies on its control by its taper, and its text (`textOf()`, a value's text as a view shows it: a gain in dB, a pan by its side, any other to its step); turned, set, toggled or reset, a command by its address where it's live, a gain to a hundredth, any other to its step; its value typed in, read as its text is written, a gain in dB, a pan by its side (`setText()`); its rings, the range each source moves it through, a macro its range mapped, a modulator from its value by its reach (`rings`) |
| `choice.ts` | `Choice`: a param or a setting with choices: its options and its value; chosen or reset, a command where it's live |
| `device.ts` | `Device`: a node as a device, its address, its name and kind, its controls in order: a composite's macros in its template's order, a block's params, then the settings within it; what every control has (`Control`), a knob's and a choice's |
| `envelope.ts` (`EnvelopeDrawing`) | `EnvelopeDrawing`, an envelope's curve as it's drawn: a level a step, from its gate opening; where its delay ends; the note's end, none for a trigger's. `envelopeDrawing()`: an envelope's curve from its knobs, as the instrument plays it (the ARP's, `libs/modular-audio/plan/blocks/`), a level a step, its delay's end and the note's marked; drawn as long as it takes where it's asked no length, held until it has settled onto its sustain, then its release |
| `custom-views.ts` | `CustomViews`: a view of its own, registered by a node's kind, where a view is more than its params: a meter, the limiter's reduction, an envelope's curve |
| `meters.ts` | `meterFall()`: a level bar's fall, as a DIN peak meter's, up at once to its peak, back down 20 dB in 1.5 s, silence below -80 dB; `Meters`, each bar's level kept by its key, falling |
| `limiter-history.ts` | `LimiterHistory`: the limiter's history, oldest first, a column each interval, the loudest in, out and taken away of its frames (`Peaks`), the oldest let go, silent at first; a long frame its peaks in one column, then silence |
| `chosen.ts` | `Chosen`: what's chosen in the composites a view shows, as a synth's panel keeps the page you were on: each rack's pad, by the rack's key; each group's tab, by its composite's key and the group's title; none until chosen |
| `device-panel.ts` | `DevicePanel`: the device view, what's open in it, by a kind and what of it (`open()`, `'strip:'` and a strip's address), its title and the slot marked (`Opened`); each kind's chain of devices, handed in, the open one filled by whoever draws it; what's chosen in the composites it shows, kept as it's opened and closed (`chosen`); closed; whoever listens told as it changes |

Tested in node, in its `test/` folder: `chosen.test.js`, `device-panel.test.js`, `envelope.test.js`, `meters.test.js`, `models.test.js`, `moves.test.js`.

```js
import { ViewBuilder } from '../libs/modular-audio/view/device/models/index.ts';
const views = new ViewBuilder({ plan, valueOf, startOf, roleOf, send });   // the send handed in
const utility = views.device(['delay 1', 'utility']);   // its level and pan, its pan's law
const level = utility.controls[0];
level.text;           // '-6.0', in dB
level.turnTo(0.5);    // send({ type: 'param', address: ['delay 1', 'utility', 'level'], value: … })
```

# modular-audio/view/device/models

A plan's devices as view models, with no DOM: handed a plan and its values through a plan's readout, they hand back what a view shows of it and what it can do, as MVVM's view models do. Tested in node. Knobs, choices, a composite's groups, an envelope's curve and meters are among them, and the device view itself.

Depends on: `base/automation`, `base/params`, `base/util`, `modular-audio/plan/blocks`, `modular-audio/plan/format`, `modular-audio/view/device/readout`.

```ts
import type { PlanReadout } from '../readout/index.ts';
import { Knob, ViewBuilder } from './index.ts';

declare const planReadout: PlanReadout; // the plan and its values by address
const views = new ViewBuilder(planReadout, (command) => console.log(command)); // what's done goes out as a command
const utility = views.device([])!; // the plan's top node as a device: its controls in order
const level = utility.controls[0];
if (level instanceof Knob) {
  level.text; // '0.0', in dB: a gain's text as a view shows it
  level.turnTo(0.5); // sends { type: 'param', address: ['level'], value: 0.61 }
}
```

| Export | What it does |
|---|---|
| `new ViewBuilder(planReadout, send)`: `plan`, `control()`, `device()`, `groups()`, `matrix()`, `peakOf()`, `readingOf()`, `copiesOf()` | View models for whatever part of a plan is asked: a param or a setting as a control, a node as a device, a composite's children grouped by role, its sources as a mod matrix, and a level, a reading and a pool's copies by address (`view-builder.ts`). |
| `MatrixRow` | One row of a matrix: a `source`, the `target` it moves and the `kind` of move (`view-builder.ts`). |
| `Device`, `Control`: `address`, `kind`, `spec`, `hint`, `name`, `role`, `live`, `moves` | A node as a device: its address, name, kind and label, its slot and its controls in order, a composite's macros in its template's order, a block's params, then the settings within it. Every `Control` has the spec, hint, role and moves of its param (`device.ts`). |
| `Knob`: `value`, `position`, `text`, `rings`, `turnTo()`, `set()`, `toggle()`, `reset()`, `setText()` | A param or a setting with a range as a control: its value, its position on its control by its taper, and its text. `turnTo()`, `set()`, `toggle()` and `reset()` send a command where it's live; `setText()` reads a typed value (`knob.ts`). |
| `Ring`, `textOf()` | A ring is the range a source moves a knob through. `textOf(spec, value)` is a value's text as a view shows it: a gain in dB, a pan by its side, any other to its step (`knob.ts`). |
| `Choice` | A param or a setting with choices: its `options` and its `value`; `choose()` and `reset()` send a command where it's live (`choice.ts`). |
| `envelopeDrawing()`, `EnvelopeDrawing` | An envelope's curve from its device's knobs, as the instrument plays it: a level a step, where its delay ends and the note's end marked. Where no length is asked, it's drawn held until it has settled onto its sustain, then its release (`envelope.ts`). |
| `CustomViews` | A view of its own, registered by a node's kind (`register()`, `of()`), where a view is more than its params: a meter, the limiter's reduction, an envelope's curve (`custom-views.ts`). |
| `meterFall()`, `Meters` | A level bar's fall as a DIN peak meter's, up at once to its peak and back down 20 dB in 1.5 s; `Meters` keeps each bar's level by its key, falling (`meters.ts`). |
| `LimiterHistory`, `Peaks` | The limiter's history, oldest first, a column each interval holding the loudest in, out and taken away of its frames, the oldest let go (`limiter-history.ts`). |
| `Chosen` | What's chosen in the composites a view shows, as a synth's panel keeps the page you were on: each rack's pad and each group's tab, none until chosen (`chosen.ts`). |
| `DevicePanel`, `Opened` | The device view: what's open in it, by a kind and what of it (`open()`, `close()`), its title and the slot marked, each kind's chain of devices handed in, and what's chosen in the composites it shows; whoever listens is told as it changes (`device-panel.ts`). |

The plan and its values by address are read through the plan's readout in one place, `model.ts`, which every control and `ViewBuilder` read through.

Tests: `test/chosen.test.js`, `test/device-panel.test.js`, `test/envelope.test.js`, `test/meters.test.js`, `test/models.test.js` and `test/moves.test.js`.

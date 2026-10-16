# libs/view/models

View models built from a plan, with no DOM: handed a plan and its values through a port, they hand back what a view shows of it and what it can do, as MVVM's view models do (`mockup/architecture/layout.md`, "How a plan is shown"). Reads only the plan's format and the params' specs; tested in node. Since LAY12b.

| Part | Holds |
|---|---|
| `model.ts` | `Model`: the plan and its values by address, read through the tool's port (`ModelPort`): each value as it plays, the plan's where none was told; its start, which a reset brings back; how it's set (`Role`: live here, automated by what its track plays, fixed as built); what's done, sent as a command |
| `view-builder.ts` | `ViewBuilder`: view models for whatever part of a plan is asked: a param or a setting as a control (`control()`), a node as a device (`device()`) |
| `knob.ts` | `Knob`: a param or a setting with a range as a control: its name, unit, range and taper its declared spec; its value, where it lies on its control by its taper, and its text, a gain in dB, a pan by its side, any other to its step; turned, set, toggled or reset, a command by its address where it's live, a gain to a hundredth, any other to its step |
| `choice.ts` | `Choice`: a param or a setting with choices: its options and its value; chosen or reset, a command where it's live |
| `device.ts` | `Device`: a node as a device, its name and kind, its controls in order: a composite's macros in its template's order, a block's params, then the settings within it |
| `command.ts` | `Command`: what's done in a view, by address: a param's, which the tool records through the sequencer and sets; a setting's, a rebuild, not recorded |
| `custom.ts` | `CustomViews`: a view of its own, registered by a node's kind, where a view is more than its params: a meter, the limiter's reduction, an envelope's curve |

```js
import { ViewBuilder } from '../libs/view/models/index.ts';
const views = new ViewBuilder({ plan, valueOf, startOf, roleOf, send });   // the tool's port
const utility = views.device(['delay 1', 'utility']);   // its level and pan, its pan's law
const level = utility.controls[0];
level.text;           // '-6.0', in dB
level.turnTo(0.5);    // send({ type: 'param', address: ['delay 1', 'utility', 'level'], value: … })
```

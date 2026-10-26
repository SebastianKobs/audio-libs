# modular-audio/view/device/dom

A plan's devices drawn in the DOM from their view models, on the views' HTML: one implementation of the views, as Web Audio is of the sound.

Depends on: `base/html`, `base/params`, `base/util`, `modular-audio/plan/format`, `modular-audio/view/device/models`.

```ts
import type { Device } from '../models/index.ts';
import { controlHint, deviceHtml } from './index.ts';

declare const device: Device; // from the models' ViewBuilder
const html = deviceHtml(device, { status: 'Utility', reset: 'Reset', hintOf: controlHint });
html.text; // '<div class="device flowless" data-device="">…': its bar, then its controls, each marked with its address
```

Drawn elements are bound to their models as they're drawn, each marked with its model's address, so a drag, a refresh and a click find an element's model by the element alone, with no routing (`Bound`).

| Export | What it does |
|---|---|
| `Bound`, `CONTROL_MARKS` | Drawn elements bound to their models: `bind(within, modelOf)` binds each marked element to the model at its address, `at(element)` finds it. `CONTROL_MARKS` are the marks a control is drawn with: a knob, a live one's drag, a switch, a list of choices (`bound.ts`). |
| `knobHtml()`, `faderHtml()`, `stillPanHtml()`, `EMPTY` | A knob drawn: its label, its bar by its taper, a ring for each source that moves it, its text and its address; a live one is marked for its drag. `faderHtml()` is an upright fader, `stillPanHtml()` a pan that does nothing, `EMPTY` the dash for a value nothing sets (`knob-view.ts`). |
| `refreshKnobs()`, `new KnobDrag({ within, knobOf, moved })` | `refreshKnobs()` brings the knobs within an element up to date as they play. `KnobDrag` drags the live ones, up or down, the whole travel in 200 px and a tenth of that with shift; typed into by a click on the value, and set back to their start by a double-click (`knob-view.ts`). |
| `meterHtml()`, `meterPosition()` | A level bar by the name its level is read by, red at full scale; and where a level shows on it, even in dB with -18 dBFS two thirds up (`meter-view.ts`). |
| `deviceHtml()`, `controlsHtml()`, `DeviceLook` | A device drawn from its model: its bar, its status and its reset, then its controls, a view of its own first, each with its name, unit and hint. A time with a sync switch shows its note while synced, its free time while not (`device-view.ts`). |
| `groupHtml()`, `Group`, `GroupLook` | A group of a composite's children drawn as a synth's panel groups its modules: its title, a tab for each child where it has more than one, the chosen one's controls (`group-view.ts`). |
| `CompositeView`, `Composite`, `CompositeLook`, `Rack` | A composite drawn in a device's box, an instrument's and a strip's alike: with a face, its own device as a group, its children in tabs by role and its matrix; flat, its controls in a device of its own. A rack of composites gets a pad each (`composite-view.ts`). |
| `controlHint()` | A control's hint, one wording for every view: its own words, how it's set (live, by its macro, by its notes, fixed as built) and its modulators (`hint.ts`). |
| `CustomView` | A view of its own, the contract every one meets, registered by a device's kind: `html()` draws before the device's controls, and `shown()` runs once it's in the page and says each frame whether it's still there (`custom-view.ts`). |
| `envelopeHtml()`, `EnvelopeView` | An envelope's curve drawn as SVG, its line and the area under it, its delay's end dotted and the note's end dashed, 60 px a second. `EnvelopeView` is the envelope generator's view of its own, drawn again on a frame its knobs changed it (`envelope-view.ts`). |
| `matrixHtml()` | A matrix drawn, a row a source and what it moves, how much: a macro's map as text, a modulator's reach a knob of its own (`matrix-view.ts`). |
| `choiceHtml()`, `switchHtml()` | A choice drawn as a list of its options, closed where it isn't live; a switch on or off, a click toggling a live one (`choice-view.ts`). |
| `LimiterView`, `LimiterLook` | The limiter's view of its own: its history, what came out and in red what it cut on the meters' scale, its ceiling a line, and what it takes away now. `LimiterLook` hands in the colors and this frame's step in seconds (`limiter-view.ts`). |
| `DevicePanelView`, `DeviceChain` | The device view drawn from its model, as Ableton's detail view, below the tracks, a box's devices left to right, drawn again as its model changes. A `DeviceChain` fills the row for a kind of opening and, where it has one, its own part of the head; `refresh()` brings knobs and views of their own up to date on every frame (`device-panel-view.ts`). |

Tests: `test/bound.test.js`, `test/card.test.js`, `test/composite-view.test.js`, `test/hint.test.js` and `test/meter-view.test.js`, on HTML as text and on values.

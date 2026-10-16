# libs/view/dom

The view models (`libs/view/models/`) drawn in the DOM: one implementation of the views, as Web Audio is of the sound (`mockup/architecture/layout.md`, "How a plan is shown"). Since LAY12d1, the session view's strips drawn on it.

| Part | Holds |
|---|---|
| `elements.ts` | `makeElement()`, an element made, its class and its text; `html```, HTML made from a template, every value escaped as it's made, a list's items one after another (`Html`); `setHtml()`, the views' one way into the page's HTML, and `appendHtml()`, added after what's there; the session view's until LAY12d1 (`session-view/html.ts`) |
| `knob-view.ts` | `knobHtml()`: a knob drawn, its label, its bar by its taper, a gain's unity marked, a pan's from its middle, its text, marked with its address (`data-knob`); a live one marked for its drag and its hint (`data-set`), a read-only one by how it's set, empty where nothing sets it now; `refreshKnobs()`, the knobs within an element brought up to date as they play; `stillPanHtml()`, a pan that does nothing, on a strip whose channel has none; `faderHtml()`, a fader, upright, its unity marked; `KnobDrag`, the live knobs within an element dragged, up or down, the whole travel in 200 px, a tenth of that with shift, and set back to their start by a double-click |
| `meter-view.ts` | `meterFall()`, a level bar's fall, as a DIN peak meter's; `meterPosition()`, where a level shows on it, even in dB, -18 dBFS two thirds up; `meterHtml()`, a level bar by the name its level is read by, red at full scale; `mixer-surface/meters.ts` until LAY12d1 |
| `device-view.ts` | `deviceHtml()`: a device drawn from its model (LAY12e1), its bar its status and its reset, then a view of its own and its knobs, each its name and unit, its hint as the view gives it; a setting shown only where it's live (`DeviceLook`) |
| `strip-view.ts` | `stripHtml()`: a strip drawn from its model, its name, where it goes and what plays on it as the view says (`StripLook`), its slots, its sends, pan, fader, level bar, value, mute and solo; quiet where it's silent; `slotsHtml()`, its inserts' slots, each its device and what sets it; `muteSoloHtml()`, its mute and solo by its key |

Tested in node on HTML as text (`test/`); a knob's drag by the session view's end-to-end tests.

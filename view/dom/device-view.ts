// ---------- view/dom/device-view: a device drawn ----------
// As Ableton shows a device:
//   1. its bar: its status, what it is and what it does, and what sets it; a reset for what's
//      live on it, where the view gives one;
//   2. its controls: a view of its own first, where it has one; then each knob, by its name
//      and unit, read-only where it isn't live, marked by how it's set.
// A setting shown only where it's live: one fixed as built isn't the device's to change.
import { addressText } from '../../plan/format/index.ts';
import { Knob, type Control, type Device } from '../models/index.ts';
import { html, type Html } from './elements.ts';
import { knobHtml } from './knob-view.ts';

// How a view shows a device beside the device itself:
//   - status: its bar's line; reset: its reset button's label, none for no reset;
//   - own: a view of its own, drawn before its knobs;
//   - hintOf(): a control's hint.
export interface DeviceLook {
  readonly status: string;
  readonly reset?: string;
  readonly own?: Html;
  readonly hintOf: (control: Control) => string;
}

// A device drawn from its model.
export function deviceHtml(device: Device, look: DeviceLook): Html {
  const key = addressText(device.address);
  const reset =
    look.reset === undefined ? html`` : html`<button class="reset" data-reset="${key}">${look.reset}</button>`;
  const knobs = device.controls
    .filter(shown)
    .map((knob) => knobHtml(labelOf(knob), knob, { title: look.hintOf(knob) }));
  return html`<div class="device flowless" data-device="${key}"><div class="bar"><div class="status" title="${look.status}">${look.status}</div>${reset}</div><div class="body"><div class="controls">${look.own ?? ''}${knobs}</div></div></div>`;
}

// whether a control is shown as a knob: a param with a range, or a setting with one that's live
function shown(control: Control): control is Knob {
  return control instanceof Knob && (control.kind === 'param' || control.live);
}
// a knob's label: its name, its unit after it
function labelOf(knob: Knob): string {
  return knob.unit === undefined ? knob.name : `${knob.name} (${knob.unit})`;
}

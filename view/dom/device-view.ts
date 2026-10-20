// ---------- view/dom/device-view: a device drawn ----------
// As Ableton shows a device:
//   1. its bar: its status, what it is and what it does, and what sets it; a reset for what's
//      live on it, where the view gives one;
//   2. its controls: a view of its own first, where it has one; then each, by its name and
//      unit, a knob, a switch or a choice, read-only where it isn't live, marked by how it's
//      set.
// A setting shown only where it's live: one fixed as built isn't the device's to change.
// A time with a sync switch shows its note while synced, its free time while not.
import { timeParamsIn } from '../../params/index.ts';
import { addressText } from '../../plan/format/index.ts';
import { Choice, type Control, type Device, type Knob } from '../models/index.ts';
import { choiceHtml, switchHtml } from './choice-view.ts';
import { html, type Html } from '../html/index.ts';
import { knobHtml } from './knob-view.ts';

// How a view shows a device beside the device itself:
//   - status: its bar's line; reset: its reset button's label, none for no reset;
//   - own: a view of its own, drawn before its controls;
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
  return html`<div class="device flowless" data-device="${key}"><div class="bar"><div class="status" title="${look.status}">${look.status}</div>${reset}</div><div class="body">${controlsHtml(device, look)}</div></div>`;
}
// A device's controls drawn: a view of its own first, where it has one, marked with the
// device's address; then each shown.
export function controlsHtml(device: Device, { own, hintOf }: Pick<DeviceLook, 'own' | 'hintOf'>): Html {
  const controls = shownOf(device.controls).map((control) => controlHtml(control, hintOf(control)));
  if (!own) {
    return html`<div class="controls">${controls}</div>`;
  }
  return html`<div class="controls" data-own="${addressText(device.address)}">${own}${controls}</div>`;
}

// Its controls shown, in order:
//   - a param, or a setting where it's live;
//   - of a time with a sync switch, the note while synced, the free time while not.
function shownOf(controls: readonly Control[]): Control[] {
  const shown = controls.filter(({ kind, live }) => kind === 'param' || live);
  const time = timeParamsIn(shown.map(({ name }) => name));
  if (!time) {
    return shown;
  }
  const sync = shown.find(({ name }) => name === time.sync) as Knob; // found by its name, a switch
  const hidden = sync.value > 0 ? time.free : time.note;
  return shown.filter(({ name }) => name !== hidden);
}
// a control drawn: a choice as a list, a switch, any other a knob
function controlHtml(control: Control, title: string): Html {
  if (control instanceof Choice) {
    return choiceHtml(control.name, control, title);
  }
  const knob = control as Knob; // not a choice: a knob
  if (knob.isSwitch) {
    return switchHtml(knob.name, knob, title);
  }
  return knobHtml(labelOf(knob), knob, { title });
}
// a knob's label: its name, its unit after it
function labelOf(knob: Knob): string {
  return knob.unit === undefined ? knob.name : `${knob.name} (${knob.unit})`;
}

// ---------- view/device/dom/choice-view: a choice drawn, and a switch ----------
// A choice: a list of its options, the one it is chosen; a read-only one as its notes or the
// desk set it, its list closed.
// A switch: on or off, a click toggling a live one.
// Each marked with its address: a list by its choosing, a switch by its toggle.
import { addressText } from '../../../plan/format/index.ts';
import type { Choice, Knob } from '../models/index.ts';
import { html, type Html } from '../../html/index.ts';

// A choice drawn as a list of its options.
export function choiceHtml(label: string, choice: Choice, title: string): Html {
  const role = choice.live ? '' : ` ${choice.role.by}`;
  const closed = choice.live ? html`` : html` disabled`;
  const options = choice.options.map((option) =>
    option === choice.value ? html`<option selected>${option}</option>` : html`<option>${option}</option>`,
  );
  return html`<label class="choice${role}" title="${title}"><span>${label}</span><select data-choose="${addressText(choice.address)}"${closed}>${options}</select></label>`;
}
// A switch drawn on or off.
export function switchHtml(label: string, knob: Knob, title: string): Html {
  const key = addressText(knob.address);
  const on = knob.value > 0;
  const role = knob.live ? '' : ` ${knob.role.by}`;
  const toggle = knob.live ? html` data-toggle="${key}"` : html``;
  return html`<div class="switch${on ? ' on' : ''}${role}" data-knob="${key}"${toggle} title="${title}"><span>${label}</span><b>${on ? 'on' : 'off'}</b></div>`;
}

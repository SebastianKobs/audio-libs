// ---------- view/mixer/dom/strip-view: a strip drawn ----------
// As a mixer's strip, top to bottom:
//   1. its name, a click opening its devices; where it goes; what plays on it now;
//   2. its inserts, a slot each, as Pro Tools shows them: its device and what sets it;
//   3. its sends' knobs, its pan, its fader with its level bar and its value, its mute and
//      solo.
// Quiet, drawn so, where a mute or another's solo has it silent.
// Empty, where its track plays nothing: its sends and its fader at the bottom, each value a
// dash.
import { addressText } from '../../../plan/format/index.ts';
import type { Device, Knob } from '../../device/models/index.ts';
import type { Strip } from '../models/index.ts';
import { html, type Html } from '../../html/index.ts';
import { EMPTY, faderHtml, knobHtml, meterHtml, stillPanHtml } from '../../device/dom/index.ts';

// How a view shows a strip beside the strip itself:
//   - name: as the view names it; route: where it goes, as shown; now: what plays on it;
//   - opens: what a click on its name or a slot opens, as attributes; a slot's mark added;
//   - sendLabel(): a send's knob's label, by its return; level: its bar's level now;
//   - empty: its track plays nothing now.
export interface StripLook {
  readonly name: string;
  readonly route: string;
  readonly now?: Html | string;
  readonly opens?: Html;
  readonly sendLabel: (to: string) => string;
  readonly level: number;
  readonly empty?: boolean;
}

// A strip drawn from its model.
export function stripHtml(strip: Strip, look: StripLook): Html {
  const key = addressText(strip.address);
  const sounds = strip.mute ? html` data-sounds="${key}"` : html``;
  const opens = look.opens ?? html``;
  const slots = slotsHtml(strip.inserts.map(slotOf), look.opens);
  return html`<div class="track${strip.quiet ? ' quiet' : ''}"${sounds}><div class="name"${opens}>${look.name}</div><div class="route">${look.route}</div>${look.now ?? ''}${slots}${mixHtml(strip, look, key)}</div>`;
}
// A strip's inserts, in the order the sound goes through them, each its device and what
// sets it; marked by its place where a click opens them.
export function slotsHtml(slots: readonly [device: string, by: string][], opens: Html | undefined): Html {
  if (!slots.length) {
    return html``;
  }
  const mark = (index: number): Html => (opens ? html`${opens} data-mark="${index}"` : html``);
  return html`<div class="inserts">${slots.map(([device, by], index) => html`<div class="slot"${mark(index)}>${device}${by ? html`<small>${by}</small>` : ''}</div>`)}</div>`;
}
// A strip's mute and solo, by its key, each lit where it's on.
export function muteSoloHtml(key: string, muted: boolean, soloed: boolean): Html {
  return html`<div class="ms"><b data-mute="${key}" class="${muted ? 'on' : ''}" title="mute">M</b><b data-solo="${key}" class="${soloed ? 'on' : ''}" title="solo; shift adds or removes it">S</b></div>`;
}

// its sends, its pan, its fader, its level bar, its value, its mute and solo
function mixHtml(strip: Strip, look: StripLook, key: string): Html {
  const empty = look.empty ?? false;
  const sends = strip.sends.map((send) => knobHtml(look.sendLabel(send.name), send, { empty }));
  const pan = strip.pan ? knobHtml('pan', strip.pan) : stillPanHtml();
  const muteSolo = strip.mute && strip.solo ? muteSoloHtml(key, on(strip.mute), on(strip.solo)) : '';
  const value = empty ? EMPTY : `${strip.volume.text} dB`;
  return html`<div class="mix">${sends}${pan}
  <div class="vol">${faderHtml(strip.volume, empty)}${meterHtml(key, look.level)}<b class="val">${value}</b>${muteSolo}</div></div>`;
}
// An insert's slot: its device's label, and what sets it, as the tool says; a live device
// with a level its gain as it plays.
function slotOf(device: Device): [device: string, by: string] {
  if (device.slot?.setBy !== undefined) {
    return [device.label, device.slot.setBy];
  }
  const level = device.controls.find(({ name, live }) => name === 'level' && live) as Knob | undefined;
  return [device.label, level ? `gain ${level.text} dB` : ''];
}
// whether a switch is on
function on(knob: Knob): boolean {
  return knob.value > 0;
}

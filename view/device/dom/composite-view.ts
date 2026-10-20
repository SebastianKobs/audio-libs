// ---------- view/device/dom/composite-view: a composite drawn, an instrument's and a strip's alike ----------
// A composite drawn in a device's box, as its look says:
//   - with a face: its own device as a group, its children grouped by role in tabs, in the
//     look's order, its matrix where the look shows it (an instrument's voice card);
//   - flat: its controls in a device of its own (a strip's insert, an effect).
// A rack of composites gets a pad each, the chosen one's box shown (a drum rack).
// Its bar: its status line, the owner's buttons, and a reset where its look gives one.
// Each control's hint in one wording (controlHint()); a device's view of its own by its kind,
// registered once (register()), redrawn on every frame while it's shown (redraw()).
// The chosen pad of each rack and tab of each group its model's, handed in (Chosen); each
// reset drawn, by its key, its own, as the elements it binds are.
import { addressOf, addressText, type Address } from '../../../util/index.ts';
import { CustomViews, type Chosen, type Control, type Device, type ViewBuilder } from '../models/index.ts';
import { Bound, CONTROL_MARKS } from './bound.ts';
import type { CustomView } from './custom-view.ts';
import { deviceHtml } from './device-view.ts';
import { appendHtml, html, type Html } from '../../html/index.ts';
import { groupHtml, type GroupLook } from './group-view.ts';
import { controlHint } from './hint.ts';
import { matrixHtml } from './matrix-view.ts';

// A composite as a view shows it: what its chosen tabs are kept by, its models, its address.
export interface Composite {
  readonly key: string;
  readonly models: ViewBuilder;
  readonly address: Address;
}
// A rack: composites a pad each, by its name, one shown; kept by its key.
export interface Rack {
  readonly key: string;
  readonly pads: readonly { readonly name: string; readonly composite: Composite }[];
}
// A reset, where something on it is live: its button's label and hint, and what it does.
export interface Reset {
  readonly label: string;
  readonly title?: string;
  readonly run: () => void;
}
// How a composite is shown:
//   - kind: its box's class beside 'device', a face's alone;
//   - status: its bar's line; buttons: its owner's, beside its reset;
//   - own: its own device's group title, shown with a face; none, not shown;
//   - groups: with a face, its children's groups by role, in order, each its title; none, flat;
//   - matrix: with a face, whether its matrix is shown.
export interface CompositeLook {
  readonly kind?: string;
  readonly status: string;
  readonly buttons?: Html;
  readonly reset?: Reset;
  readonly own?: string;
  readonly groups?: ReadonlyMap<string, string>;
  readonly matrix?: boolean;
}

// Composites drawn, their chosen pads and tabs read from their model (see the top of this file).
// Drawn into an element, each control bound to its model (append(), appendRack()).
export class CompositeView {
  readonly #chosen: Chosen; // each rack's pad, each group's tab
  readonly #resets = new Map<string, () => void>(); // each reset drawn, by its key
  readonly #custom = new CustomViews<CustomView>();
  readonly #redraws = new Set<() => boolean>(); // each view of its own shown
  // each control's hint, each device's view of its own
  readonly #look: GroupLook = { hintOf: controlHint, ownOf: (device) => this.#custom.of(device)?.html(device) };
  readonly #bound: Bound<Control>;

  // chosen: each rack's pad and each group's tab, as they're chosen;
  // bound: where each control drawn is bound to its model
  constructor({ chosen, bound = new Bound<Control>(CONTROL_MARKS) }: { chosen: Chosen; bound?: Bound<Control> }) {
    this.#chosen = chosen;
    this.#bound = bound;
  }
  // a view of its own for a device's kind, once
  register(kind: string, view: CustomView): void {
    this.#custom.register(kind, view);
  }
  // every view of its own shown redrawn, one gone from the page let go: on every frame
  redraw(): void {
    for (const redraw of this.#redraws) {
      if (!redraw()) {
        this.#redraws.delete(redraw);
      }
    }
  }
  // A composite drawn at the end of an element, its controls bound; its box handed back.
  append(within: Element, composite: Composite, look: CompositeLook): Element {
    return this.#appended(within, composite, this.html(composite, look));
  }
  // A rack drawn at the end of an element, the shown composite's controls bound; its box
  // handed back.
  appendRack(within: Element, rack: Rack, look: CompositeLook): Element {
    return this.#appended(within, this.#shownOf(rack), this.rackHtml(rack, look));
  }
  // A composite's box: flat, or with a face, as its look says.
  html(composite: Composite, look: CompositeLook): Html {
    const device = composite.models.device(composite.address)!; // drawn where it's there
    if (!look.groups) {
      const key = addressText(device.address);
      this.#keepReset(key, look.reset);
      const own = this.#look.ownOf?.(device);
      return deviceHtml(device, {
        status: look.status,
        hintOf: controlHint,
        ...(look.reset && { reset: look.reset.label }),
        ...(own && { own }),
      });
    }
    return this.#boxHtml(composite.key, composite, look, html``);
  }
  // A rack's box: its pads, where it has more than one, the chosen one's face.
  rackHtml(rack: Rack, look: CompositeLook): Html {
    const shown = this.#shownOf(rack);
    const pads = rack.pads.length > 1 ? padsHtml(rack, shown) : html``;
    return this.#boxHtml(rack.key, shown, look, pads);
  }
  // A drawn reset run, by its key; whether there was one.
  reset(key: string): boolean {
    const run = this.#resets.get(key);
    run?.();
    return run !== undefined;
  }
  // A click within what it drew: a pad or a tab chosen, or a reset run.
  // Whether it changed what's shown, to draw it again.
  clicked(target: Element): boolean {
    const pad = target.closest<HTMLElement>('[data-pad]')?.dataset.pad;
    const rack = target.closest<HTMLElement>('[data-rack]')?.dataset.rack;
    const tab = target.closest<HTMLElement>('[data-tab]')?.dataset.tab;
    const reset = target.closest<HTMLElement>('[data-reset]')?.dataset.reset;
    if (pad !== undefined && rack !== undefined) {
      this.#chosen.choosePad(rack, pad);
      return true;
    }
    if (tab !== undefined) {
      return this.#chooseTabAt(target, tab);
    }
    return reset !== undefined && this.reset(reset);
  }
  #chooseTabAt(target: Element, tab: string): boolean {
    const composite = target.closest<HTMLElement>('[data-card]')?.dataset.card;
    const group = target.closest<HTMLElement>('[data-group]')?.dataset.group;
    if (composite === undefined || group === undefined) {
      return false;
    }
    this.#chosen.chooseTab(composite, group, tab);
    return true;
  }
  // Drawn at the end of an element: its controls bound, its views of their own shown.
  #appended(within: Element, composite: Composite, drawn: Html): Element {
    appendHtml(within, drawn);
    const box = within.lastElementChild!; // drawn above
    this.#bound.bind(box, (address) => composite.models.control(address));
    for (const element of box.querySelectorAll<HTMLElement>('[data-own]')) {
      this.#show(element, composite.models.device(addressOf(element.dataset.own!))); // marked with it
    }
    return box;
  }
  #show(element: Element, device: Device | undefined): void {
    const view = device && this.#custom.of(device);
    if (view) {
      this.#redraws.add(view.shown(element, device));
    }
  }
  // the pad chosen, else the first
  #shownOf({ key, pads }: Rack): Composite {
    const chosen = pads.find(({ composite }) => composite.key === this.#chosen.padOf(key)) ?? pads[0]!; // a rack: one at least
    return chosen.composite;
  }
  // A box with a face: its bar, a rack's pads, its face in a body, held to the box's height,
  // a long group scrolling.
  #boxHtml(key: string, composite: Composite, look: CompositeLook, pads: Html): Html {
    this.#keepReset(key, look.reset);
    const reset = resetHtml(key, look.reset);
    const status = html`<div class="status" title="${look.status}">${look.status}</div>`;
    const kind = look.kind ? ` ${look.kind}` : '';
    const bar = html`<div class="bar">${status}<div class="buttons">${look.buttons ?? ''}${reset}</div></div>`;
    return html`<div class="device${kind}" data-rack="${key}">${bar}${pads}<div class="body"><div class="face" data-card="${composite.key}">${this.#faceHtml(composite, look)}</div></div></div>`;
  }
  // A face: its own device, its children's groups in the look's order, its matrix.
  #faceHtml({ key, models, address }: Composite, look: CompositeLook): Html {
    const groups = look.groups ?? new Map<string, string>();
    const own =
      look.own ? groupHtml({ title: look.own, devices: [models.device(address)!], chosen: '' }, this.#look) : html``;
    const order = [...groups.keys()];
    const children = models
      .groups(address)
      .map(({ role, devices }) => ({ order: order.indexOf(role), title: groups.get(role) ?? role, devices }))
      .sort((one, other) => one.order - other.order)
      .map(({ title, devices }) =>
        groupHtml({ title, devices, chosen: this.#chosen.tabOf(key, title) ?? '' }, this.#look),
      );
    const matrix = look.matrix ? matrixGroupHtml(models, address, this.#look) : html``;
    return html`${own}${children}${matrix}`;
  }
  #keepReset(key: string, reset: Reset | undefined): void {
    if (reset) {
      this.#resets.set(key, reset.run);
    }
  }
}

// a rack's pads, a tab each, by its name, the one shown marked
function padsHtml(rack: Rack, shown: Composite): Html {
  const pads = rack.pads.map(({ name, composite }) =>
    composite === shown ?
      html`<button class="chosen" data-pad="${composite.key}">${name}</button>`
    : html`<button data-pad="${composite.key}">${name}</button>`,
  );
  return html`<div class="group-tabs pads">${pads}</div>`;
}
// a box's reset button, by its key; none for none
function resetHtml(key: string, reset: Reset | undefined): Html {
  if (!reset) {
    return html``;
  }
  const title = reset.title === undefined ? html`` : html` title="${reset.title}"`;
  return html`<button class="reset" data-reset="${key}"${title}>${reset.label}</button>`;
}
// what moves what, and how much, as a group of its own
function matrixGroupHtml(models: ViewBuilder, address: Address, look: GroupLook): Html {
  const matrix = matrixHtml(models.matrix(address), look);
  return html`<div class="group" data-group="matrix"><div class="group-title">matrix</div><div class="group-body">${matrix}</div></div>`;
}

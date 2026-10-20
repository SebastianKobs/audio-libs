// ---------- view/dom/group-view: a group of a composite's children drawn, a tab each ----------
// As a synth's panel groups its modules, a section each, its tabs between them:
//   1. its title;
//   2. a tab for each child, where it has more than one, the chosen one marked;
//   3. the chosen child's controls, a view of its own first where it has one.
// Each tab marked with its child's name, which a click chooses it by.
import type { Control, Device } from '../models/index.ts';
import { controlsHtml } from './device-view.ts';
import { html, type Html } from '../html/index.ts';

// A group: its title, its children as devices, the one chosen by its name.
export interface Group {
  readonly title: string;
  readonly devices: readonly Device[];
  readonly chosen: string;
}
// How a view shows a group's children: a control's hint; a child's view of its own, where it
// has one.
export interface GroupLook {
  readonly hintOf: (control: Control) => string;
  readonly ownOf?: (device: Device) => Html | undefined;
}

// A group drawn; the first child shown where the chosen one is none of them.
export function groupHtml({ title, devices, chosen }: Group, { hintOf, ownOf }: GroupLook): Html {
  const shown = devices.find(({ name }) => name === chosen) ?? devices[0];
  const tabs = devices.length > 1 ? tabsHtml(devices, shown) : html``;
  const own = shown && ownOf?.(shown);
  const body = shown ? controlsHtml(shown, { hintOf, ...(own && { own }) }) : html``;
  return html`<div class="group" data-group="${title}"><div class="group-title">${title}</div>${tabs}<div class="group-body">${body}</div></div>`;
}

// a tab for each child, the one shown marked
function tabsHtml(devices: readonly Device[], shown: Device | undefined): Html {
  const tabs = devices.map(({ name }) =>
    name === shown?.name ?
      html`<button class="chosen" data-tab="${name}">${name}</button>`
    : html`<button data-tab="${name}">${name}</button>`,
  );
  return html`<div class="group-tabs">${tabs}</div>`;
}

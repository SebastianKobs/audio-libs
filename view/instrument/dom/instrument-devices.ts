// ---------- view/instrument/dom/instrument-devices: each role's instrument as a device ----------
// A chain of the device view's (DeviceChain, device-panel-view.ts), opened by a clip track's
// roles, drawn from the instruments' model (InstrumentRacks, libs/view/instrument/models/) as a synth's
// panel:
//   1. its bar: what it is, the test note's button, held as long as it is, and its reset;
//   2. a drum rack: a tab for each pad, by its key, the chosen pad's card shown;
//   3. the card's face, its groups side by side, as its owner titles them, and its matrix.
// The test note's row is its owner's (head()): drawn in the device view's head, told which
// instruments are shown each time one is (shown()), to grey the values none of them reads.
import type { InstrumentRacks } from '../models/index.ts';
import type { CompositeLook, CompositeView, DeviceChain } from '../../device/dom/index.ts';
import { html } from '../../html/index.ts';

// How an instrument is shown, in its owner's words:
//   - own: its voice card's own group's title;
//   - groups: its modules' groups by their roles, in order, each its title;
//   - play: the test note's button, its label and hint;
//   - reset: the reset's label and hint.
export interface InstrumentLook {
  readonly own: string;
  readonly groups: ReadonlyMap<string, string>;
  readonly play: { readonly label: string; readonly title: string };
  readonly reset: { readonly label: string; readonly title: string };
}

export class InstrumentDevices implements DeviceChain {
  readonly #racks: InstrumentRacks;
  readonly #look: InstrumentLook;
  readonly #head: (element: HTMLElement) => void;
  readonly #shown: (roles: readonly string[]) => void;

  // head(): the test note's row drawn in the device view's head
  // shown(): the roles whose instruments are shown, each time one is drawn
  constructor({
    racks,
    look,
    head,
    shown,
  }: {
    racks: InstrumentRacks;
    look: InstrumentLook;
    head: (element: HTMLElement) => void;
    shown: (roles: readonly string[]) => void;
  }) {
    this.#racks = racks;
    this.#look = look;
    this.#head = head;
    this.#shown = shown;
  }
  // The instruments of a clip track's roles, by their names, one after another.
  fill(container: HTMLElement, roles: string, composites: CompositeView): void {
    for (const role of roles.split(',')) {
      this.#device(container, role, composites);
    }
  }
  head(element: HTMLElement): void {
    this.#head(element);
  }
  // A role's instrument as a device, a rack of its cards, a pad each; none for a role with no
  // instrument.
  #device(container: HTMLElement, role: string, composites: CompositeView): void {
    const rack = this.#racks.rackOf(role);
    if (!rack) {
      return;
    }
    const pads = rack.pads.map(({ name, patch, models }) => ({ name, composite: { key: patch, models, address: [] } }));
    const box = composites.appendRack(container, { key: role, pads }, this.#lookOf(role, rack.status));
    this.#playButton(box.querySelector<HTMLElement>('[data-play]')!, role); // drawn with its box
    const shown = [...container.querySelectorAll<HTMLElement>('[data-rack]')].map(({ dataset }) => dataset.rack!); // marked so
    this.#shown(shown);
  }
  // How an instrument is shown: a synth's panel, its bar its status, the test note's button and
  // its reset
  #lookOf(role: string, status: string): CompositeLook {
    const { own, groups, play, reset } = this.#look;
    return {
      kind: 'instrument',
      status,
      buttons: html`<button class="play" data-play title="${play.title}">${play.label}</button>`,
      reset: { ...reset, run: () => this.#racks.reset(role) },
      own,
      groups,
      matrix: true,
    };
  }
  // the test note's button, for a role's instrument: a note held for as long as it is
  #playButton(button: HTMLElement, role: string): void {
    button.addEventListener('pointerdown', () => this.#racks.press(role));
    for (const eventName of ['pointerup', 'pointerleave', 'pointercancel']) {
      button.addEventListener(eventName, () => this.#racks.lift());
    }
  }
}

// ---------- view/device/dom/device-panel-view: the device view drawn, below the tracks ----------
import { Choice, Knob, type Control, type DevicePanel } from '../models/index.ts';
import { Bound, CONTROL_MARKS } from './bound.ts';
import { CompositeView } from './composite-view.ts';
import type { CustomView } from './custom-view.ts';
import { makeElement } from '../../html/index.ts';
import { KnobDrag, refreshKnobs } from './knob-view.ts';

// The device view drawn from its model (DevicePanel, libs/view/device/models/device-panel.ts), as
// Ableton's detail view: below the tracks, a track's own devices left to right, drawn again as
// its model changes. Each kind of opening a chain of devices (DeviceChain):
//   - the owner's: a clip track's instruments, by their roles;
//   - a strip's inserts, by its address (InsertDevices, insert-devices.ts), an FX channel's
//     effect and the master's limiter among them.
// A slot also marks its device. What opens with no devices shows an empty view.
// Each control is bound to its model as it's drawn, by what draws it: a drag, a refresh and
// a click find it by its element (Bound).
// While it's open, the strip grows, floating over the page, which keeps the whole window.

// The devices a kind of opening shows:
//   - fill(): drawn into the row, each a composite, for what of it is opened;
//   - head(): where it has one, its own part of the head, drawn once, shown while it's open (an
//     instrument's test note).
export interface DeviceChain {
  fill(row: HTMLElement, which: string, composites: CompositeView): void;
  head?(element: HTMLElement): void;
}

// The device view's panel, made as the view starts: below the tracks, its title, each chain's
// head, its row of devices, its close.
export class DevicePanelView {
  readonly #view: DevicePanel<DeviceChain>;
  readonly #strip: HTMLDivElement;
  readonly #heads = new Map<string, HTMLElement>(); // each chain's head, by its kind
  readonly #bound = new Bound<Control>(CONTROL_MARKS); // each control drawn, its model
  // instruments and inserts drawn as composites, their chosen pads and tabs the model's
  readonly #composites: CompositeView;
  readonly #title = makeElement('span', 'devtitle');
  readonly #row = makeElement('div', 'devrow');

  // view: its model, what's open and each kind's chain
  // strip: the strip along the bottom, the device view its last part
  // custom: the views of their own, by a device's kind
  constructor({
    view,
    strip,
    custom,
  }: {
    view: DevicePanel<DeviceChain>;
    strip: HTMLDivElement;
    custom: Readonly<Record<string, CustomView>>;
  }) {
    this.#composites = new CompositeView({ chosen: view.chosen, bound: this.#bound });
    for (const [kind, own] of Object.entries(custom)) {
      this.#composites.register(kind, own);
    }
    this.#view = view;
    this.#strip = strip;
    const devicesPanel = makeElement('div', 'devices');
    const devHead = makeElement('div', 'devhead');
    const close = makeElement('b', 'close', '×');
    close.title = 'Close the device view';
    devHead.append(this.#title);
    for (const [kind, chain] of view.chains) {
      this.#headOf(devHead, kind, chain);
    }
    devHead.append(close);
    devicesPanel.append(devHead, this.#row);
    this.#strip.appendChild(devicesPanel);
    close.addEventListener('click', () => view.close());
    // a device's knobs dragged, typed into, and set back by a double-click or its reset
    new KnobDrag({
      within: this.#row,
      knobOf: (element) => this.#bound.at(element),
      moved: () => this.#refreshKnobs(),
    });
    this.#row.addEventListener('click', (event) => this.#clicked(event));
    this.#row.addEventListener('change', (event) => this.#chosen(event));
    view.onChange(() => this.#draw());
  }
  // On every frame while it's open: its knobs brought up to date, as they play, and the views
  // of their own redrawn, an envelope's curve as it's set, the limiter's history.
  // a chain's own part of the head, where it has one, drawn once
  #headOf(devHead: HTMLElement, kind: string, chain: DeviceChain): void {
    if (!chain.head) {
      return;
    }
    const element = makeElement('div', 'devnote');
    devHead.append(element);
    chain.head(element);
    this.#heads.set(kind, element);
  }
  refresh(): void {
    this.#refreshKnobs();
    this.#composites.redraw();
  }
  #refreshKnobs(): void {
    refreshKnobs(this.#row, (element) => this.#bound.at(element));
  }
  // A click on a device:
  //   - a pad or a tab chosen, or a reset, an instrument's or an insert's (CompositeView);
  //   - a switch: toggled.
  // Drawn again, so what it shows follows: a time's note or its ms.
  #clicked(event: Event): void {
    const target = event.target as Element;
    const toggled = target.closest<HTMLElement>('[data-toggle]');
    if (this.#composites.clicked(target)) {
      this.#draw();
      return;
    }
    if (toggled) {
      const knob = this.#bound.at(toggled);
      if (knob instanceof Knob) {
        knob.toggle();
      }
    } else {
      return;
    }
    this.#draw();
  }
  // a choice chosen from its list
  #chosen(event: Event): void {
    const list = (event.target as Element).closest<HTMLSelectElement>('select[data-choose]');
    const choice = list && this.#bound.at(list);
    if (choice instanceof Choice) {
      choice.choose(list!.value); // a list found
      this.#draw();
    }
  }
  // Drawn from what's open: its devices left to right, the device a slot marks scrolled to.
  // Closed: the row emptied, the strip back to its size.
  #draw(): void {
    const opened = this.#view.opened;
    this.#row.replaceChildren();
    if (!opened) {
      this.#strip.classList.remove('devices-open');
      return;
    }
    this.#title.textContent = opened.title;
    for (const [kind, head] of this.#heads) {
      head.style.display = kind === opened.kind ? '' : 'none'; // its own chain's alone
    }
    this.#view.chain?.fill(this.#row, opened.which, this.#composites);
    if (!this.#row.children.length) {
      this.#row.append(makeElement('div', 'nodevices', `${opened.title}: no devices`));
    }
    this.#mark(opened.mark);
    this.#strip.classList.add('devices-open');
  }
  // the device marked, a slot's, scrolled to
  #mark(mark: number): void {
    const marked = this.#row.children[mark];
    if (mark >= 0 && marked) {
      marked.classList.add('marked');
      marked.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
}

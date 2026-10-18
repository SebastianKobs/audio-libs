// ---------- view/dom/device-panel: the device view, below the tracks ----------
import { Choice, Knob, type Control } from '../models/index.ts';
import { Bound, CONTROL_MARKS } from './bound.ts';
import { CompositeView } from './composite-view.ts';
import type { CustomView } from './custom-view.ts';
import { makeElement } from './elements.ts';
import { KnobDrag, refreshKnobs } from './knob-view.ts';

// The device view, as Ableton's detail view: below the tracks, a track's own devices left to
// right. Opened by what its owner asks, a kind and what of it (open()), each kind a chain of
// devices handed in (DeviceChain):
//   - the owner's: a clip track's instruments, by their roles;
//   - a strip's inserts, by its address (InsertDevices, insert-devices.ts), an FX channel's
//     effect and the master's limiter among them.
// A slot also marks its device. What opens with no devices shows an empty view.
// Each control is bound to its model as it's drawn, by what draws it: a drag, a refresh and
// a click find it by its element (Bound).
// While it's open, the strip grows, floating over the garden, which keeps the whole window.

// The devices a kind of opening shows:
//   - fill(): drawn into the row, each a composite, for what of it is opened;
//   - head(): where it has one, its own part of the head, drawn once, shown while it's open (an
//     instrument's test note).
export interface DeviceChain {
  fill(row: HTMLElement, which: string, composites: CompositeView): void;
  head?(element: HTMLElement): void;
}

// The device view itself, made as the view starts: its panel below the tracks, its title, each
// chain's head, its row of devices, its close (open(), close()).
export class DevicePanel {
  readonly #strip: HTMLDivElement;
  readonly #chains: Readonly<Record<string, DeviceChain>>;
  readonly #heads = new Map<string, HTMLElement>(); // each chain's head, by its kind
  readonly #bound = new Bound<Control>(CONTROL_MARKS); // each control drawn, its model
  // instruments and inserts drawn as composites, the chosen pads and tabs kept
  readonly #composites = new CompositeView({ bound: this.#bound });
  readonly #title = makeElement('span', 'devtitle');
  readonly #row = makeElement('div', 'devrow');
  // what's open, its title, what it shows and the device marked: opened again as a switch or
  // a choice changes what it shows
  #opened: [title: string, what: string, mark: number] | null = null;

  // strip: the strip along the bottom, the device view its last part
  // chains: what each kind of opening shows, by the kind
  // custom: the views of their own, by a device's kind
  constructor({
    strip,
    chains,
    custom,
  }: {
    strip: HTMLDivElement;
    chains: Readonly<Record<string, DeviceChain>>;
    custom: Readonly<Record<string, CustomView>>;
  }) {
    for (const [kind, view] of Object.entries(custom)) {
      this.#composites.register(kind, view);
    }
    this.#strip = strip;
    this.#chains = chains;
    const devicesPanel = makeElement('div', 'devices');
    const devHead = makeElement('div', 'devhead');
    const close = makeElement('b', 'close', '×');
    close.title = 'Close the device view';
    devHead.append(this.#title);
    for (const [kind, chain] of Object.entries(chains)) {
      this.#headOf(devHead, kind, chain);
    }
    devHead.append(close);
    devicesPanel.append(devHead, this.#row);
    this.#strip.appendChild(devicesPanel);
    close.addEventListener('click', () => this.close());
    // a device's knobs dragged, typed into, and set back by a double-click or its reset
    new KnobDrag({
      within: this.#row,
      knobOf: (element) => this.#bound.at(element),
      moved: () => this.#refreshKnobs(),
    });
    this.#row.addEventListener('click', (event) => this.#clicked(event));
    this.#row.addEventListener('change', (event) => this.#chosen(event));
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
  // Opened again, so what it shows follows: a time's note or its ms.
  #clicked(event: Event): void {
    const target = event.target as Element;
    const toggled = target.closest<HTMLElement>('[data-toggle]');
    if (this.#composites.clicked(target)) {
      this.#openAgain();
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
    this.#openAgain();
  }
  // a choice chosen from its list
  #chosen(event: Event): void {
    const list = (event.target as Element).closest<HTMLSelectElement>('select[data-choose]');
    const choice = list && this.#bound.at(list);
    if (choice instanceof Choice) {
      choice.choose(list!.value); // a list found
      this.#openAgain();
    }
  }
  #openAgain(): void {
    if (this.#opened) {
      this.open(...this.#opened);
    }
  }
  // What's opened, its devices left to right; the device a slot marks scrolled to.
  // what: a kind and what of it, 'strip:' and its address, as a chain fills it.
  open(title: string, what: string, mark = -1): void {
    const devRow = this.#row;
    const [kind, which] = what.split(/:(.*)/) as [string, string]; // data-open's: a kind and what of it
    devRow.replaceChildren();
    this.#opened = [title, what, mark];
    this.#title.textContent = title;
    for (const [shown, head] of this.#heads) {
      head.style.display = shown === kind ? '' : 'none'; // its own chain's alone
    }
    this.#chains[kind]?.fill(devRow, which, this.#composites);
    if (!devRow.children.length) {
      devRow.append(makeElement('div', 'nodevices', `${title}: no devices`));
    }
    this.#mark(mark);
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
  close(): void {
    this.#opened = null;
    this.#strip.classList.remove('devices-open');
    this.#row.replaceChildren();
  }
}

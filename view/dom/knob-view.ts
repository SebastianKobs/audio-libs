// ---------- view/dom/knob-view: a knob drawn, dragged and set back ----------
// Drawn as a mixer's small knob: its label, its bar, its text.
//   - a pan's bar drawn from its middle;
//   - any other's by its taper, a gain's unity marked.
// A fader: the same, upright, its unity marked two thirds up.
// A live one dragged and set back (KnobDrag):
//   - up or down, its whole travel in 200 px, a tenth of that with shift, each move from the
//     last, so shift can come and go;
//   - a double-click sets it back to its start.
import { positionOf } from '../../params/index.ts';
import { addressOf, addressText, type Address } from '../../plan/format/index.ts';
import { clamp01 } from '../../util/index.ts';
import { Knob } from '../models/index.ts';
import { html, type Html } from './elements.ts';

const LIVE = 'drag up or down to set it, with shift for finer steps; double-click: back to where it started';
// a knob's whole travel in px, and how much finer it goes with shift
const TRAVEL = 200;
const FINER = 10;
// a value nothing sets now, as a knob or a fader shows it
export const EMPTY = '—';

// A knob drawn: its label, its bar, its text; a live one marked with its address, for a drag.
// Empty, where nothing sets it now: its bar at the bottom, a dash for its text.
export function knobHtml(label: string, knob: Knob, empty = false): Html {
  const unity = knob.isPan ? '' : `;--unity:${positionOf(knob.spec, 1)}`;
  const at = empty ? 0 : knob.position;
  return html`<div class="knob"${liveMark(knob)}><span>${label}</span><i class="${knob.isPan ? 'pan' : ''}" style="--v:${at}${unity}"></i><b>${empty ? EMPTY : knob.text}</b></div>`;
}
// A pan that does nothing, at its middle: on a strip whose channel has none.
export function stillPanHtml(): Html {
  return html`<div class="knob"><span>pan</span><i class="pan" style="--v:0.5"></i><b>C</b></div>`;
}
// A fader drawn: its bar by its taper, its unity marked; empty, its bar at the bottom.
export function faderHtml(knob: Knob, empty = false): Html {
  return html`<div class="fader" style="--unity:${positionOf(knob.spec, 1)}"${liveMark(knob)}><i style="--v:${empty ? 0 : knob.position}"></i></div>`;
}

// A live knob's mark: its address, which a drag finds it by, and the hint of what it does.
function liveMark(knob: Knob): Html {
  if (!knob.live) {
    return html``;
  }
  return html` data-set="${addressText(knob.address)}" title="${LIVE}"`;
}

// The knobs drawn within an element, dragged and set back, listened for from when it's made.
// knobOf(): a knob by its address, as drawn now; moved(): called as one moves, to draw again.
export class KnobDrag {
  readonly #knobOf: (address: Address) => unknown;
  readonly #moved: () => void;
  #drag: { knob: Knob; pointerY: number; position: number } | null = null;

  constructor({
    within,
    knobOf,
    moved,
  }: {
    within: HTMLElement;
    knobOf: (address: Address) => unknown;
    moved: () => void;
  }) {
    this.#knobOf = knobOf;
    this.#moved = moved;
    within.addEventListener('pointerdown', (event) => this.#start(event));
    window.addEventListener('pointermove', (event) => this.#move(event));
    window.addEventListener('pointerup', () => {
      this.#drag = null;
    });
    within.addEventListener('dblclick', (event) => this.#reset(event));
  }
  // a press on a live knob starts its drag, from where its value lies on it
  #start(event: PointerEvent): void {
    const knob = this.#knobAt(event);
    if (!knob) {
      return;
    }
    event.preventDefault();
    this.#drag = { knob, pointerY: event.clientY, position: knob.position };
  }
  // the drag moves it by how far the pointer went up or down, ten times finer with shift
  #move(event: PointerEvent): void {
    if (!this.#drag) {
      return;
    }
    const travel = (this.#drag.pointerY - event.clientY) / (event.shiftKey ? TRAVEL * FINER : TRAVEL);
    this.#drag.pointerY = event.clientY;
    this.#drag.position = clamp01(this.#drag.position + travel);
    this.#drag.knob.turnTo(this.#drag.position);
    this.#moved();
  }
  #reset(event: Event): void {
    const knob = this.#knobAt(event);
    if (knob) {
      knob.reset();
      this.#moved();
    }
  }
  // the live knob an event is on, by its mark; none on anything else
  #knobAt(event: Event): Knob | undefined {
    const text = (event.target as Element).closest<HTMLElement>('[data-set]')?.dataset.set;
    if (text === undefined) {
      return undefined;
    }
    const knob = this.#knobOf(addressOf(text));
    return knob instanceof Knob ? knob : undefined;
  }
}

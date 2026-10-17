// ---------- view/dom/knob-view: a knob drawn, dragged and set back ----------
// Drawn as a mixer's small knob: its label, its bar, its text.
//   - a pan's bar drawn from its middle;
//   - any other's by its taper, a gain's unity marked;
//   - a ring under its bar for each source that moves it, the range it moves it through, as
//     Serum's modulation rings.
// A fader: the same, upright, its unity marked two thirds up.
// A live one dragged, typed into and set back (KnobDrag):
//   - up or down, its whole travel in 200 px, a tenth of that with shift, each move from the
//     last, so shift can come and go;
//   - a setting set once, as the drag ends: each change a rebuild;
//   - a click on its value a field to type one, as Ableton's: Enter sets it, Escape or a click
//     elsewhere leaves it; one it can't read kept in the field, marked;
//   - a double-click sets it back to its start.
import { positionOf } from '../../params/index.ts';
import { addressOf, addressText, type Address } from '../../plan/format/index.ts';
import { clamp01 } from '../../util/index.ts';
import { Knob, type Ring } from '../models/index.ts';
import { html, type Html } from './elements.ts';

// A knob as drawn now, by its address and the element it's drawn as, which says whose it is
// where a view draws several plans' knobs.
type KnobOf = (address: Address, element: Element) => unknown;

const LIVE =
  'drag up or down to set it, with shift for finer steps; click its value to type one; double-click: back to where it started';
// a knob's whole travel in px, and how much finer it goes with shift
const TRAVEL = 200;
const FINER = 10;
// a value nothing sets now, as a knob or a fader shows it
export const EMPTY = '—';

// A knob drawn: its label, its bar, its text, marked with its address (refreshKnobs()).
//   - live: marked so, for a drag, its hint how to drag it unless it's given one;
//   - read-only: marked by how it's set, automated or fixed;
//   - empty, where nothing sets it now: its bar at the bottom, a dash for its text.
export function knobHtml(
  label: string,
  knob: Knob,
  { empty = false, title }: { empty?: boolean; title?: string } = {},
): Html {
  const unity = knob.isPan ? '' : `;--unity:${positionOf(knob.spec, 1)}`;
  const at = empty ? 0 : knob.position;
  const role = knob.live ? '' : ` ${knob.role.by}`;
  const mark = html` data-knob="${addressText(knob.address)}"${liveMark(knob, title)}`;
  const rings = knob.rings.map(ringHtml);
  return html`<div class="knob${role}"${mark}><span>${label}</span><i class="${knob.isPan ? 'pan' : ''}" style="--v:${at}${unity}">${rings}</i><b>${empty ? EMPTY : knob.text}</b></div>`;
}
// a ring: where it starts on the knob and how far it reaches, either way, named by its source
function ringHtml({ by, from, to }: Ring): Html {
  return html`<u class="ring" style="--from:${Math.min(from, to)};--span:${Math.abs(to - from)}" title="moved by ${by}"></u>`;
}
// A pan that does nothing, at its middle: on a strip whose channel has none.
export function stillPanHtml(): Html {
  return html`<div class="knob"><span>pan</span><i class="pan" style="--v:0.5"></i><b>C</b></div>`;
}
// A fader drawn: its bar by its taper, its unity marked; empty, its bar at the bottom.
export function faderHtml(knob: Knob, empty = false): Html {
  return html`<div class="fader" style="--unity:${positionOf(knob.spec, 1)}"${liveMark(knob)}><i style="--v:${empty ? 0 : knob.position}"></i></div>`;
}

// A knob's mark: live, its address, which a drag finds it by; its hint, the one given, else
// a live one's how to drag it.
function liveMark(knob: Knob, title?: string): Html {
  const hint = title === undefined ? html`` : html` title="${title}"`;
  if (!knob.live) {
    return hint;
  }
  return html` data-set="${addressText(knob.address)}"${title === undefined ? html` title="${LIVE}"` : hint}`;
}
// The knobs drawn within an element brought up to date, each by its address: its bar and its
// text, as it plays now, its notes moving it; a value being typed left alone.
export function refreshKnobs(within: Element, knobOf: KnobOf): void {
  for (const element of within.querySelectorAll<HTMLElement>('.knob[data-knob]')) {
    const knob = knobOf(addressOf(element.dataset.knob!), element); // marked with it
    if (!(knob instanceof Knob)) {
      continue;
    }
    element.querySelector<HTMLElement>('i')?.style.setProperty('--v', String(knob.position));
    const text = element.querySelector('b');
    if (text && !text.querySelector('input')) {
      text.textContent = knob.text;
    }
  }
}

// The knobs drawn within an element, dragged, typed into and set back, listened for from when
// it's made. knobOf(): a knob by its address, as drawn now; moved(): called as one moves, to
// draw again.
export class KnobDrag {
  readonly #knobOf: KnobOf;
  readonly #moved: () => void;
  #drag: { knob: Knob; pointerY: number; position: number } | null = null;

  constructor({ within, knobOf, moved }: { within: HTMLElement; knobOf: KnobOf; moved: () => void }) {
    this.#knobOf = knobOf;
    this.#moved = moved;
    within.addEventListener('pointerdown', (event) => this.#start(event));
    window.addEventListener('pointermove', (event) => this.#move(event));
    window.addEventListener('pointerup', () => this.#end());
    within.addEventListener('dblclick', (event) => this.#reset(event));
    within.addEventListener('click', (event) => this.#type(event));
  }
  // a press on a live knob starts its drag, from where its value lies on it; not on its value,
  // which a click types into
  #start(event: PointerEvent): void {
    if (onValue(event)) {
      return;
    }
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
    if (this.#drag.knob.kind === 'param') {
      this.#drag.knob.turnTo(this.#drag.position);
      this.#moved();
    }
  }
  // the drag ended: a setting set where it was left
  #end(): void {
    const drag = this.#drag;
    this.#drag = null;
    if (drag?.knob.kind === 'setting') {
      drag.knob.turnTo(drag.position);
      this.#moved();
    }
  }
  #reset(event: Event): void {
    const knob = onValue(event) ? undefined : this.#knobAt(event);
    if (knob) {
      knob.reset();
      this.#moved();
    }
  }
  // A click on a live knob's value: a field in its place, its text to start from.
  //   - Enter: set to what's typed, drawn again; kept, marked, where it can't be read;
  //   - Escape, or a click elsewhere: left as it was.
  #type(event: Event): void {
    const value = (event.target as Element).closest('b');
    const knob = this.#knobAt(event);
    if (!value || !knob || value.querySelector('input')) {
      return;
    }
    const field = document.createElement('input');
    field.value = knob.text;
    const leave = (): void => {
      value.textContent = knob.text;
    };
    field.addEventListener('keydown', (key) => {
      if (key.key === 'Escape') {
        leave();
      } else if (key.key === 'Enter' && knob.setText(field.value)) {
        leave();
        this.#moved();
      } else if (key.key === 'Enter') {
        field.classList.add('unread');
      }
    });
    field.addEventListener('blur', leave);
    value.replaceChildren(field);
    field.select();
  }
  // the live knob an event is on, by its mark; none on anything else
  #knobAt(event: Event): Knob | undefined {
    const marked = (event.target as Element).closest<HTMLElement>('[data-set]');
    if (!marked) {
      return undefined;
    }
    const knob = this.#knobOf(addressOf(marked.dataset.set!), marked); // found by its mark
    return knob instanceof Knob ? knob : undefined;
  }
}

// whether an event is on a knob's value, its text or the field typed into
function onValue(event: Event): boolean {
  return (event.target as Element).closest('.knob b') !== null;
}

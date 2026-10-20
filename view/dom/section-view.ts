// ---------- view/dom/section-view: a section of a view, its strips in a row ----------
// As a mixer's sections stand side by side: a label, then its strips in a row.
// A section that folds: a click on its label folds it to its first strip, and back.
//   - With shift: every section beside it that folds, as this one goes.
//   - Which are folded is a model's (Toggles), by each section's label, every section beside it
//     reading the same one; drawn from it.
//   - Folded, its light shows while a hidden strip sounds.
import type { Toggles } from '../models/index.ts';
import { makeElement } from '../html/index.ts';

// what a click on a folding section's label does, as its hint says
const FOLD =
  'Click to fold this section to its first track, or unfold it; shift-click: all of them, as this one goes. Folded, its light shows while a hidden track sounds.';

// A section, made at the end of what it's in.
// Its strips are told apart by what they sound as (data-sounds).
export class SectionView {
  readonly element = makeElement('div', 'sec');
  readonly row = makeElement('div', 'row');
  readonly #dot: HTMLElement | null = null;

  // label: as the view names it, and its key among the sections folded;
  // folding: which sections are folded, where a click on it folds it, an arrow after it;
  // folded(): told after a click folded it or the sections beside it.
  constructor(
    within: HTMLElement,
    label: string,
    { folding, folded = () => {} }: { folding?: Toggles; folded?: () => void } = {},
  ) {
    const head = makeElement('div', 'seclabel', folding ? `${label} →` : label);
    this.element.append(head, this.row);
    within.appendChild(this.element);
    if (!folding) {
      return;
    }
    this.#dot = makeElement('i', 'dot');
    head.append(this.#dot);
    this.element.dataset.section = label;
    this.element.classList.toggle('folded', folding.has(label));
    Object.assign(head.dataset, { fold: '', title: FOLD });
    head.addEventListener('click', (event) => {
      fold(label, within, folding, event.shiftKey);
      folded();
    });
  }
  // Its light: on while a strip after its first sounds, by what it sounds as.
  light(heard: ReadonlySet<string>): void {
    if (!this.#dot) {
      return;
    }
    const strips = [...this.row.querySelectorAll<HTMLElement>('[data-sounds]')].slice(1);
    this.#dot.classList.toggle(
      'lit',
      strips.some((strip) => heard.has(strip.dataset.sounds!)), // selected by it
    );
  }
}

// A section folded to its first strip, or unfolded; with every section beside it that folds,
// as this one goes. Each section beside it then drawn as its folding says.
function fold(label: string, within: HTMLElement, folding: Toggles, all: boolean): void {
  const sections = [...within.querySelectorAll<HTMLElement>(':scope > .sec[data-section]')];
  const every = sections.map((section) => section.dataset.section!); // selected by it
  folding.turn(label, all ? every : [label]);
  for (const section of sections) {
    section.classList.toggle('folded', folding.has(section.dataset.section!));
  }
}

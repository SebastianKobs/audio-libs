// ---------- view/dom/views: the session view and the arrangement, a tab each ----------
import { Events } from '../../util/index.ts';
import type { ArrangementView } from './arrangement/arrangement-view.ts';
import { makeElement } from './elements.ts';

// a view, its tab's name
export type ViewName = 'session' | 'arrangement';

// The session view and the arrangement, as Ableton's two views:
//   - a tab each, its owner's, opening and closing it (tab());
//   - one open at a time, in the one strip along the bottom, shown while either is open;
//   - whoever listens told which one shows, or none, as it changes (onShow()).
// The strip along the bottom of the page (strip): the session view's sections in one row
// (flow), as the sound flows, then the arrangement. Made on the page at once.
export class Views {
  readonly strip = makeElement('div', 'strip');
  readonly flow = makeElement('div', 'sections'); // not .flow: the editor's strips style that
  readonly #arrangement: ArrangementView;
  readonly #events = new Events<{ show: [view: ViewName | null] }>();
  #shown: ViewName | null = null;

  constructor({ arrangement }: { arrangement: ArrangementView }) {
    this.#arrangement = arrangement;
    this.strip.id = 'session';
    this.strip.append(this.flow, arrangement.element);
    document.body.appendChild(this.strip);
    this.#apply();
  }
  // the one open, if either is
  get shown(): ViewName | null {
    return this.#shown;
  }
  // a view's tab opened, or closed; another's closing as this one opens leaves it shown
  tab(view: ViewName, opened: boolean): void {
    if (!opened && this.#shown !== view) {
      return;
    }
    this.#shown = opened ? view : null;
    this.#apply();
    this.#events.emit('show', this.#shown);
  }
  onShow(listener: (view: ViewName | null) => void): void {
    this.#events.on('show', listener);
  }
  #apply(): void {
    this.strip.style.display = this.#shown ? '' : 'none';
    this.flow.style.display = this.#shown === 'session' ? '' : 'none';
    this.#arrangement.show(this.#shown === 'arrangement');
  }
}

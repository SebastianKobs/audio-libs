// ---------- view/tracks/dom/view-strip: the strip along the bottom, the session view and the arrangement ----------
import type { Views } from '../models/index.ts';
import type { ArrangementView } from './arrangement/arrangement-view.ts';
import { makeElement } from '../../html/index.ts';

// The session view and the arrangement drawn, as Ableton's two views, from which one is open
// (Views, libs/view/tracks/models/views.ts):
//   - one open at a time, in the one strip along the bottom, shown while either is open;
//   - drawn again as which one is open changes.
// The strip (strip): the session view's sections in one row (flow), as the sound flows, then
// the arrangement. Made on the page at once.
export class ViewStrip {
  readonly strip = makeElement('div', 'strip');
  readonly flow = makeElement('div', 'sections'); // not .flow: the editor's strips style that
  readonly #views: Views;
  readonly #arrangement: ArrangementView;

  constructor({ views, arrangement }: { views: Views; arrangement: ArrangementView }) {
    this.#views = views;
    this.#arrangement = arrangement;
    this.strip.id = 'session';
    this.strip.append(this.flow, arrangement.element);
    document.body.appendChild(this.strip);
    views.onShow(() => this.#draw());
    this.#draw();
  }
  #draw(): void {
    const shown = this.#views.shown;
    this.strip.style.display = shown ? '' : 'none';
    this.flow.style.display = shown === 'session' ? '' : 'none';
    this.#arrangement.show(shown === 'arrangement');
  }
}

// ---------- view/tracks/models/views: the session view and the arrangement, which one is open. Pure ----------
// As Ableton's two views: one open at a time, or none, a tab each opening and closing it.
// Whoever listens told which one shows, or none, as it changes (onShow()).
import { Events } from '../../../util/index.ts';

// a view, its tab's name
export type ViewName = 'session' | 'arrangement';

export class Views {
  readonly #events = new Events<{ show: [view: ViewName | null] }>();
  #shown: ViewName | null = null;

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
    this.#events.emit('show', this.#shown);
  }
  onShow(listener: (view: ViewName | null) => void): void {
    this.#events.on('show', listener);
  }
}

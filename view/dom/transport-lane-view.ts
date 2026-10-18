// ---------- view/dom/transport-lane-view: the transport's lane drawn ----------
// ▶ and ■, and where the music is, bar and beat, its model's (TransportLane, libs/view/models/).
// Put at the top of the element it's handed, as a DAW's transport bar.
// What ▶ and ■ do is the owner's: sent as messages, play and stop.
// Its hints the owner's, in its own words.
// Drawn on every frame, as a key may play and stop it too.
import type { TransportLane } from '../models/index.ts';
import { makeElement } from './elements.ts';

// What ▶ and ■ send.
type TransportMessage = { type: 'play' } | { type: 'stop' };
// The hints on ▶, ■ and the position, as the owner words them.
export interface TransportHints {
  readonly play: string;
  readonly stop: string;
  readonly position: string;
}

export class TransportLaneView {
  readonly #lane: TransportLane;
  readonly #play = makeElement('button', '', '▶');
  readonly #position = makeElement('span', 'position');

  constructor({
    lane,
    within,
    hints,
    send,
  }: {
    lane: TransportLane;
    within: HTMLElement; // the lane put at its top
    hints: TransportHints;
    send: (message: TransportMessage) => void;
  }) {
    this.#lane = lane;
    const element = makeElement('div', 'transport');
    const stop = makeElement('button', '', '■');
    this.#play.title = hints.play;
    stop.title = hints.stop;
    this.#position.title = hints.position;
    this.#play.addEventListener('click', () => {
      send({ type: 'play' });
      this.draw();
    });
    stop.addEventListener('click', () => {
      send({ type: 'stop' });
      this.draw();
    });
    // named as a section is
    element.append(makeElement('span', 'label', 'transport'), this.#play, stop, this.#position);
    within.prepend(element);
    this.draw();
  }
  // Whether it plays, and where the music is. Written only when it changes.
  draw(): void {
    this.#play.classList.toggle('on', this.#lane.playing);
    const position = this.#lane.position();
    if (this.#position.textContent !== position) {
      this.#position.textContent = position;
    }
  }
}

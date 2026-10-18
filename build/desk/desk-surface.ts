// ---------- build/desk/desk-surface: the desk's own control surface ----------
// A strip's fader or knob moved by hand, on a view or a panel, played into the input handed in
// (a sequencer) as a controller on the strip's track, as any control surface plays into it: so
// it's recorded on that track's lanes, as every controller is, and reaches the desk the way
// they do.
//   - The controller: its param's address on the strip (volume, send/reverb, utility/level).
//   - Gliding there, but a switch, a choice or a delay line's time (the desk's glides()).
//   - The stream's label for the strip's track its owner's, handed in.
//   - Each move told to whoever listens: the transport passing that lane over while it plays
//     back.
import { SMOOTHING } from '../../automation/index.ts';
import type { Clock } from '../../clock/index.ts';
import type { Controller } from '../../midi/index.ts';
import { Events } from '../../util/index.ts';
import type { Desk } from './desk.ts';
import type { DeskBuilt } from './desk-state.ts';

// Where a move is played: a controller sent to a strip's track, with its label.
interface MoveInput<Label> {
  send(to: { track: string; play: Label | undefined }, messages: readonly Controller[]): void;
}

export class DeskSurface<Label> {
  readonly #desk: Pick<Desk<DeskBuilt>, 'glides'>;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #input: MoveInput<Label>;
  readonly #label: (strip: string) => Label | undefined;
  readonly #events = new Events<{ control: [strip: string, controller: string] }>();

  // label: the stream's label for a strip's track, none for a strip of the desk's own
  constructor({
    desk,
    clock,
    input,
    label,
  }: {
    desk: Pick<Desk<DeskBuilt>, 'glides'>;
    clock: Pick<Clock, 'now'>;
    input: MoveInput<Label>;
    label: (strip: string) => Label | undefined;
  }) {
    this.#desk = desk;
    this.#clock = clock;
    this.#input = input;
    this.#label = label;
  }
  control(strip: string, controller: string, value: number): void {
    const t = this.#clock.now();
    this.#events.emit('control', strip, controller);
    const change: Controller =
      this.#desk.glides(strip, controller) ?
        { type: 'controller', controller, value, t, glide: SMOOTHING }
      : { type: 'controller', controller, value, t };
    this.#input.send({ track: strip, play: this.#label(strip) }, [change]);
  }
  onControl(listener: (strip: string, controller: string) => void): void {
    this.#events.on('control', listener);
  }
}

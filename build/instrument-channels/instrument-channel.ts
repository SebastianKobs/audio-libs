// ---------- build/instrument-channels/instrument-channel: a track's sounding end ----------
// As a DAW's track: the messages handed it go two ways.
//   - Notes, and what's sent for them: to its instrument, made at its first note, its sound
//     going where the track's channel takes it in.
//   - Controllers: to its strip, set on the desk (its control()).
// A strip that's a track of its own (a bus, an FX bus or the master) has no instrument.
// One kind of track; what's on it is given as it's made (instrument-channel-factory.ts).
// A sequencer's track by its shape: a receiver with a role, the stream's label.
import type { Message, Receiver } from '../../midi/index.ts';
import type { Desk, DeskBuilt } from '../desk/index.ts';

export class InstrumentChannel implements Receiver {
  readonly role: string;
  readonly #strip: string;
  readonly #desk: Pick<Desk<DeskBuilt>, 'control'>;
  readonly #instrumentMade: (() => Receiver) | null;
  #instrument: Receiver | null = null;

  // strip: its strip's name, its controllers';
  // role: what its notes play on, the stream's label;
  // instrument: how its instrument is made, patched where the track goes; none for a strip's.
  constructor({
    strip,
    role,
    desk,
    instrument = null,
  }: {
    strip: string;
    role: string;
    desk: Pick<Desk<DeskBuilt>, 'control'>;
    instrument?: (() => Receiver) | null;
  }) {
    this.#strip = strip;
    this.role = role;
    this.#desk = desk;
    this.#instrumentMade = instrument;
  }
  receive(messages: readonly Message[]): void {
    this.#instrumentFor(messages)?.receive(messages); // its controllers it leaves alone
    for (const message of messages) {
      if (message.type === 'controller') {
        this.#desk.control(this.#strip, message);
      }
    }
  }
  // its instrument, made as its first note comes; none for a strip's alone, nor before its first note, which nothing sent can reach
  #instrumentFor(messages: readonly Message[]): Receiver | null {
    if (!this.#instrument && this.#instrumentMade && messages.some((message) => message.type === 'note on')) {
      this.#instrument = this.#instrumentMade();
    }
    return this.#instrument;
  }
}

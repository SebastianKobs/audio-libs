// ---------- build/voices/sound-module: a multitimbral sound module ----------
// As a rack synth with its parts: a part for each track, each an instrument playing a patch
// from the module's bank by name, as a program change picks one.
//   - A part made where it's told, by the builder handed in (instrument.ts).
//   - A patch edited in the bank: every part that plays it edited, its own or a pad's of its
//     rack; a part made after an edit made as edited.
//   - A new tempo told every part.
import type { Preset } from '../../plan/planner/index.ts';
import type { Instruments } from '../../plan/synth/index.ts';
import type { LiveCopies } from '../../util/index.ts';
import { Instrument, type InstrumentMaking } from './instrument.ts';

// where a part is made, and how: all an instrument's making but its file and its patch
export type PartMaking<Into> = Omit<InstrumentMaking<Into>, 'instruments' | 'patch'>;

export class SoundModule<Into> {
  readonly #instruments: Instruments;
  readonly #bank: LiveCopies<Preset>;
  readonly #parts: Instrument<Into>[] = [];
  readonly #edited = new Set<string>(); // the patches edited, by name

  // instruments: the file the patches are in, as it began; bank: its patches as they play,
  // edited in place by name
  constructor({ instruments, bank }: { instruments: Instruments; bank: LiveCopies<Preset> }) {
    this.#instruments = instruments;
    this.#bank = bank;
    bank.onSet((name, preset) => this.#edit(name, preset));
  }
  // a part playing a patch, by its name, made where it's told, as its patch is edited now
  part(patch: string, making: PartMaking<Into>): Instrument<Into> {
    const instrument = new Instrument({ ...making, instruments: this.#instruments, patch });
    for (const name of [...this.#edited].filter((edited) => instrument.plays(edited))) {
      instrument.edited(name, this.#bank.of(name)!); // edited: the bank has it
    }
    this.#parts.push(instrument);
    return instrument;
  }
  // a new beat's length, told every part
  tempo(beat: number): void {
    for (const part of this.#parts) {
      part.tempo(beat);
    }
  }

  // a patch edited in the bank: every part that plays it edited
  #edit(name: string, preset: Preset): void {
    this.#edited.add(name);
    for (const part of this.#parts.filter((each) => each.plays(name))) {
      part.edited(name, preset);
    }
  }
}

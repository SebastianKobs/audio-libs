// ---------- midi/note-map/note-map: a note looked up in a map, instrument → articulation → variant, and the fallbacks taken ----------
// Looked for in the instrument asked first, along its articulation's fallbacks, each tried with the variant asked and then either;
// then along the instrument's fallbacks, the same way. The map's checks (loader.ts) keep each chain free of loops.
import { chainFrom } from '../../base/util/index.ts';
import type { ArticulationData, NoteController, NoteMapData, Variant, VariantNote } from './map-data.ts';

// one step a lookup fell back: at which level, from what to what
export interface Fallback {
  level: 'instrument' | 'articulation' | 'variant';
  from: string;
  to: string;
}
// a note found: the note, the controller value to send with it where the map gives one, where it was found, the fallbacks taken to it
export interface FoundNote {
  note: number;
  controller?: NoteController;
  instrument: string;
  articulation: string;
  variant: Variant;
  fallbacks: Fallback[];
}
type Articulations = ReadonlyMap<string, ArticulationData>;
interface Instrument {
  fallback: string | undefined;
  articulations: Articulations;
}
// where a note was found in one instrument: the articulations followed to it, the variant it was under, and its note
interface FoundIn {
  articulations: string[];
  variant: Variant;
  target: VariantNote;
}

const EITHER: Variant = 'either';

// a note map, made by loadNoteMap() from data it has checked
export class NoteMap {
  readonly #instruments: ReadonlyMap<string, Instrument>;

  constructor(data: NoteMapData) {
    this.#instruments = new Map(
      Object.entries(data.instruments).map(([name, instrument]) => [
        name,
        { fallback: instrument.fallback, articulations: new Map(Object.entries(instrument.articulations)) },
      ]),
    );
  }
  // the note for an articulation of an instrument, played with a variant, either where none is asked; none where no fallback finds one
  lookup(instrument: string, articulation: string, variant: Variant = EITHER): FoundNote | undefined {
    const instruments = chainFrom(instrument, this.#instruments, (entry) => entry.fallback).keys;
    for (const [step, name] of instruments.entries()) {
      const found = foundIn(this.#instruments.get(name)?.articulations ?? new Map(), articulation, variant);
      if (found !== undefined) {
        return foundNote(found, variant, instruments.slice(0, step + 1));
      }
    }
    return undefined;
  }
}
// in one instrument, along an articulation's fallbacks, the first that has the variant, or else either
function foundIn(articulations: Articulations, articulation: string, variant: Variant): FoundIn | undefined {
  const chain = chainFrom(articulation, articulations, (entry) => entry.fallback).keys;
  for (const [step, name] of chain.entries()) {
    const variants = articulations.get(name)?.variants ?? {};
    for (const tried of [variant, EITHER]) {
      const target = variants[tried];
      if (target !== undefined) {
        return { articulations: chain.slice(0, step + 1), variant: tried, target };
      }
    }
  }
  return undefined;
}
// a note found, from the variant asked for and the instruments followed to it, each step a fallback
function foundNote(found: FoundIn, asked: Variant, instruments: readonly string[]): FoundNote {
  const variants = found.variant === asked ? [asked] : [asked, found.variant];
  const note: FoundNote = {
    note: found.target.note,
    instrument: instruments.at(-1)!, // the one it was found in, last followed
    articulation: found.articulations.at(-1)!, // likewise
    variant: found.variant,
    fallbacks: [
      ...stepsAlong('instrument', instruments),
      ...stepsAlong('articulation', found.articulations),
      ...stepsAlong('variant', variants),
    ],
  };
  if (found.target.controller !== undefined) {
    note.controller = found.target.controller;
  }
  return note;
}
// each step along a chain of names, from one to the next
function stepsAlong(level: Fallback['level'], names: readonly string[]): Fallback[] {
  return names.slice(1).map((to, index) => ({ level, from: names[index]!, to }));
}

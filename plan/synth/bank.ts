// ---------- plan/synth/bank: patches by name ----------
// As a synth's bank holds its programs: patches by name, in order; a program change picks one by
// its place, from 0.
import type { Preset } from '../planner/index.ts';

// A bank of patches, each a preset on its architecture.
export class Bank {
  readonly names: readonly string[];
  readonly #patches: Readonly<Record<string, Preset>>;

  constructor(patches: Readonly<Record<string, Preset>>) {
    this.#patches = patches;
    this.names = Object.freeze(Object.keys(patches));
  }
  // a patch by its name; none for a name not in the bank
  patch(name: string): Preset | undefined {
    return Object.hasOwn(this.#patches, name) ? this.#patches[name] : undefined;
  }
  // a program change's patch, by its place; none past the bank's end
  program(number: number): string | undefined {
    return this.names[number];
  }
}

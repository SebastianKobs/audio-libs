// ---------- libs/web-audio-fx/modules: FX modules as they play, by name, each edit rebuilding every chain that plays it ----------
// As libs/web-audio-synth/'s Patches has the instruments: copies of the modules it starts from, changed only through set() and reset().
// A copy is updated in place, all the way down, so a chain rebuilt from the module it holds plays the change, the old one ringing out
// first (FxChain.rebuild()).
import type { Patch } from '../synth/index.ts';
import { updateInPlace } from '../util/index.ts';

// A chain that plays some of the modules, by their names, rebuilt as one of them is edited.
interface Played {
  chain: { rebuild(): void };
  modules: readonly string[];
}

export class FxModules {
  readonly #from: Readonly<Record<string, Patch>>;
  readonly #playing: Record<string, Patch>;
  readonly #played: Played[] = [];

  // modules: those it starts from, by name, which a reset brings back
  constructor({ modules }: { modules: Readonly<Record<string, Patch>> }) {
    this.#from = modules;
    this.#playing = structuredClone(modules);
  }
  // A module as it plays, by its name: the owner's own, not a copy, for a chain to play; none for a name it hasn't.
  of(name: string): Patch | undefined {
    return this.#playing[name];
  }
  // A chain that plays these modules, rebuilt as one of them is edited.
  playedBy(chain: { rebuild(): void }, modules: readonly string[]): void {
    this.#played.push({ chain, modules });
  }
  // A module by its name, as a copy; a change set rebuilds every chain that plays it.
  current(name: string): Patch | undefined {
    return structuredClone(this.#playing[name]);
  }
  set(name: string, module: Patch): void {
    updateInPlace(this.#playing[name]!, module); // a module it has
    for (const { chain, modules } of this.#played) {
      if (modules.includes(name)) {
        chain.rebuild();
      }
    }
  }
  reset(name: string): void {
    return this.set(name, this.#from[name]!); // a module it has
  }
}

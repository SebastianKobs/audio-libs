// ---------- libs/web-audio-fx/modules: FX modules as they play, by name, each edit rebuilding every chain that plays it ----------
// As libs/web-audio-synth/'s Patches has the instruments: live copies of the modules it starts from (libs/util/'s LiveCopies), each
// set in place, so a chain rebuilt from the module it holds plays the change, the old one ringing out first (FxChain.rebuild()).
import type { Patch } from '../synth/index.ts';
import { LiveCopies } from '../util/index.ts';

// a chain rebuilt as what it plays is edited
export interface Rebuilds {
  rebuild(): void;
}
// A chain that plays some of the modules, by their names.
interface Played {
  chain: Rebuilds;
  modules: readonly string[];
}

export class FxModules extends LiveCopies<Patch> {
  readonly #played: Played[] = [];

  // modules: those it starts from, by name, which a reset brings back
  constructor({ modules }: { modules: Readonly<Record<string, Patch>> }) {
    super(modules);
    this.onSet((name) => this.#rebuild(name));
  }
  // A chain that plays these modules, rebuilt as one of them is edited.
  playedBy(chain: Rebuilds, modules: readonly string[]): void {
    this.#played.push({ chain, modules });
  }
  // every chain that plays a module, rebuilt
  #rebuild(name: string): void {
    for (const { chain, modules } of this.#played) {
      if (modules.includes(name)) {
        chain.rebuild();
      }
    }
  }
}

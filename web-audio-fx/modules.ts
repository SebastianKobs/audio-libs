// ---------- libs/web-audio-fx/modules: FX modules as they play, by name, each edit followed by every chain that plays it ----------
// As libs/web-audio-synth/'s Patches has the instruments: live copies of the modules it starts from (libs/util/'s LiveCopies), each
// set in place, so a chain planned again from the module it holds plays the change (FxChain.follow()).
import type { Patch } from '../synth/index.ts';
import { LiveCopies } from '../util/index.ts';

// a chain following what it plays as it's edited
export interface Follows {
  follow(): void;
}
// A chain that plays some of the modules, by their names.
interface Played {
  chain: Follows;
  modules: readonly string[];
}

export class FxModules extends LiveCopies<Patch> {
  readonly #played: Played[] = [];

  // modules: those it starts from, by name, which a reset brings back
  constructor({ modules }: { modules: Readonly<Record<string, Patch>> }) {
    super(modules);
    this.onSet((name) => this.#follow(name));
  }
  // A chain that plays these modules, following each edit to one of them.
  playedBy(chain: Follows, modules: readonly string[]): void {
    this.#played.push({ chain, modules });
  }
  // every chain that plays a module, following its edit
  #follow(name: string): void {
    for (const { chain, modules } of this.#played) {
      if (modules.includes(name)) {
        chain.follow();
      }
    }
  }
}

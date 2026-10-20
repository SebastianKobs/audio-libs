// ---------- build/desk/mix: the live mix's mute and solo ----------
import { addressOf, toggleIn } from '../../util/index.ts';
import { MUTE_GLIDE, silenced } from '../../plan/desk/index.ts';
import type { DeskBuilt, DeskState } from './desk-state.ts';

// The live mix's mute and solo, owned by the mixing desk (mixing-desk.ts).
// They work as Ableton's, on every track by its own key, a pool's tracks too,
// whichever play lands on them:
//   - a mute takes along what feeds the strip muted, its sends among them;
//   - a solo keeps what a soloed strip needs to be heard, its way out and what feeds it;
//     it never silences an FX bus (libs/plan/desk/'s silenced());
//   - what's silenced is cut on its channel (its cut's gain), a track's channel as it's
//     added.
// A strip's other controls are the desk's (desk-changes.ts).
export class Mix {
  readonly #desk: Pick<DeskState<DeskBuilt>, 'built' | 'wiring' | 'set'>;
  readonly #muteSolo = { muted: new Set<string>(), soloed: new Set<string>() };
  readonly #silent = new Set<string>(); // the channels cut now

  constructor({ desk }: { desk: Pick<DeskState<DeskBuilt>, 'built' | 'wiring' | 'set'> }) {
    this.#desk = desk;
  }
  // Mute and solo, on the desk once it's built, with what a mute takes along. Called again as
  // each track's channel is added.
  apply(): void {
    if (!this.#desk.built) {
      return;
    }
    const wiring = this.#desk.wiring();
    const quiet = silenced(wiring, this.#muteSolo);
    for (const { name } of wiring.children.filter(({ role }) => role !== 'master')) {
      if (quiet.has(name) === this.#silent.has(name)) {
        continue;
      }
      toggleIn(this.#silent, name, quiet.has(name));
      // every channel but the master has one
      this.#desk.set([...addressOf(name), 'cut', 'gain'], quiet.has(name) ? 0 : 1, { glide: MUTE_GLIDE });
    }
  }
  // a strip muted or soloed, or let go, as its track's mute or solo controller says
  setMute(key: string, muted: boolean): void {
    toggleIn(this.#muteSolo.muted, key, muted);
    this.apply();
  }
  setSolo(key: string, soloed: boolean): void {
    toggleIn(this.#muteSolo.soloed, key, soloed);
    this.apply();
  }
  // the strips muted and soloed now, copies
  state(): { muted: Set<string>; soloed: Set<string> } {
    return { muted: new Set(this.#muteSolo.muted), soloed: new Set(this.#muteSolo.soloed) };
  }
}

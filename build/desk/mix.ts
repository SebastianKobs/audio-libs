// ---------- build/desk/mix: the live mix's mute and solo ----------
import { toggleIn } from '../../util/index.ts';
import { MUTE_GLIDE, silenced } from '../../plan/desk/index.ts';
import { addressOf } from '../../plan/format/index.ts';
import type { DeskSetup } from './setup.ts';
import type { DeskBuilt, DeskState } from './desk-state.ts';

// The live mix's mute and solo, owned by the desk's owner.
// They work as Ableton's, on every track by its own key, replay tracks too, whichever replay
// lands on them:
//   - a mute takes along the strips its setup says (setup.ts's mutedWith());
//   - a solo keeps what a soloed strip needs to be heard, its way out and what feeds it;
//     it never silences an FX bus (libs/plan/desk/'s silenced());
//   - what's silenced is cut on its channel (its cut's gain), a track's channel as it's
//     added.
// A strip's other controls are the desk's (desk-changes.ts).
export class Mix {
  readonly #desk: Pick<DeskState<DeskBuilt>, 'built' | 'wiring' | 'set'>;
  readonly #mutedWith: DeskSetup['mutedWith'];
  readonly #muteSolo = { muted: new Set<string>(), soloed: new Set<string>() };
  readonly #silent = new Set<string>(); // the channels cut now

  // mutedWith: the setup's, the strips a mute takes along
  constructor({
    desk,
    mutedWith,
  }: {
    desk: Pick<DeskState<DeskBuilt>, 'built' | 'wiring' | 'set'>;
    mutedWith: DeskSetup['mutedWith'];
  }) {
    this.#desk = desk;
    this.#mutedWith = mutedWith;
  }
  // Mute and solo, on the desk once it's built, with the strips a mute takes along (the
  // setup's). Called again as each track's channel is added.
  apply(): void {
    if (!this.#desk.built) {
      return;
    }
    const wiring = this.#desk.wiring();
    const names = wiring.children.map(({ name }) => name);
    const { muted, soloed } = this.#muteSolo;
    const quiet = silenced(wiring, { muted: this.#mutedWith(muted, names), soloed });
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

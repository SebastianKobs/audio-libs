// ---------- libs/web-audio-synth/patches: patches as they play, by name, each edit reaching every note of one that sounds (Z7) ----------
// Copies of the patches it starts from, changed only through set() and reset(): a patch set plays from its next note, and on every note of
// it that sounds, from now (sounding.ts, G0.2b), as a synth's knob turned while a note sounds. A copy is updated in place, all the way
// down, so whoever holds it plays the change
import type { Patch } from '../synth/index.ts';
import { updateInPlace } from '../util/index.ts';
import { Sounding, type Played, type SoundingNote } from './sounding.ts';

// the patches as they play (the tool's instruments, by its roles, until Z7)
export class Patches {
  readonly #from: Readonly<Record<string, Patch>>;
  readonly #playing: Record<string, Patch>;
  readonly #sounding = new Sounding();
  readonly #now: () => number;

  // patches: those it starts from, by name, which a reset brings back. now: the context's time now, where an edit takes over
  constructor({ patches, now }: { patches: Readonly<Record<string, Patch>>; now: () => number }) {
    this.#from = patches;
    this.#playing = structuredClone(patches);
    this.#now = now;
  }
  // a patch as it plays, by its name: the owner's own, not a copy, for a note to be played on; none for a name it hasn't
  of(name: string): Patch | undefined {
    return this.#playing[name];
  }
  // a note a patch sounds, the patch the one it plays: hands back how it plays on, told what it's told (sounding.ts)
  sounds(patch: Patch, note: SoundingNote): Played {
    return this.#sounding.add(patch, note);
  }
  // a patch by its name, as a copy: a change plays from its next note, and on every note of it that sounds, from now (G0.2b)
  current(name: string): Patch | undefined {
    return structuredClone(this.#playing[name]);
  }
  set(name: string, patch: Patch): void {
    const playing = this.#playing[name]!; // a patch it has
    updateInPlace(playing, patch);
    this.#sounding.edit(playing, this.#now());
  }
  reset(name: string): void {
    return this.set(name, this.#from[name]!); // a patch it has
  }
}

// ---------- libs/web-audio-synth/patches: patches as they play, by name, each edit reaching every note of one that sounds (Z7) ----------
// Live copies of the patches it starts from (libs/util/'s LiveCopies): a patch set plays from its next note, and on every note of it
// that sounds, from now (sounding.ts, G0.2b), as a synth's knob turned while a note sounds. A copy is updated in place, all the way
// down, so whoever holds it plays the change
import type { Patch } from '../synth/index.ts';
import { LiveCopies } from '../util/index.ts';
import { Sounding, type Played, type SoundingNote } from './sounding.ts';

// the patches as they play (the tool's instruments, by its roles, until Z7)
export class Patches extends LiveCopies<Patch> {
  readonly #sounding = new Sounding();

  // patches: those it starts from, by name, which a reset brings back. now: the context's time now, where an edit takes over
  constructor({ patches, now }: { patches: Readonly<Record<string, Patch>>; now: () => number }) {
    super(patches);
    this.onSet((_name, playing) => this.#sounding.edit(playing, now()));
  }
  // a note a patch sounds, the patch the one it plays: hands back how it plays on, told what it's told (sounding.ts)
  sounds(patch: Patch, note: SoundingNote): Played {
    return this.#sounding.add(patch, note);
  }
}

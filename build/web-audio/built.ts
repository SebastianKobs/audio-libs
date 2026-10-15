// ---------- build/web-audio/built: what the Web Audio builder hands back ----------
// The thing built, as its front panel (libs/build/ports/): the placeholders it put in,
// by address; taken apart, its sources stopped, its nodes disconnected.
import type { Built } from '../ports/index.ts';
import type { Address } from '../../plan/format/index.ts';
import type { BuiltParts } from './parts.ts';

export class WebAudioBuilt implements Built {
  readonly #parts: BuiltParts;

  constructor(parts: BuiltParts) {
    this.#parts = parts;
  }
  get placeholders(): readonly Address[] {
    return this.#parts.placeholders;
  }
  dispose(): void {
    for (const source of this.#parts.sources) {
      source.stop();
    }
    for (const node of this.#parts.nodes) {
      node.disconnect();
    }
  }
}

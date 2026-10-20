// ---------- view/mixer/models/toggles: keys turned from where each starts. Pure ----------
// What a view folds or opens, by key: a section folded, a group unfolded, a track's lanes opened.
// Each key starts as its view starts it; turned, it's the other way.
// One turned alone, or every one handed in, as the one clicked goes (shift-click).
import { toggleIn } from '../../../util/index.ts';

export class Toggles {
  readonly #turned = new Set<string>();

  // the keys turned now
  get keys(): ReadonlySet<string> {
    return this.#turned;
  }
  has(key: string): boolean {
    return this.#turned.has(key);
  }
  // A key turned; every: every one handed in turned as it goes, in if it was out, or out.
  turn(clicked: string, every: readonly string[] = [clicked]): void {
    const turning = !this.#turned.has(clicked);
    for (const key of every) {
      toggleIn(this.#turned, key, turning);
    }
  }
}

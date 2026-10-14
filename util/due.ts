// ---------- util/due: things due at a time, kept in their time order ----------
import { firstAfter } from './search.ts';

// Things due at a time, each after those at the same time, so they're taken as they came.
export class DueQueue<Item> {
  readonly #items: Item[] = [];
  readonly #timeOf: (item: Item) => number;

  constructor(timeOf: (item: Item) => number) {
    this.#timeOf = timeOf;
  }
  get items(): readonly Item[] {
    return this.#items;
  }
  add(item: Item): void {
    this.#items.splice(firstAfter(this.#items, this.#timeOf(item), this.#timeOf), 0, item);
  }
  // those whose time has come, at or before now, taken out in their order
  takeDue(now: number): Item[] {
    return this.#items.splice(0, firstAfter(this.#items, now, this.#timeOf));
  }
}

// ---------- util/search: in a list rising by its key, where a time falls, by halves ----------

// the first later than t: its index, past them all their length
// By halves: each look halves what's left to look in, so a long list is quick.
export function firstAfter<Item>(items: readonly Item[], t: number, keyOf: (item: NoInfer<Item>) => number): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (keyOf(items[middle]!) > t) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}
// the last at or before t; none before the first
export function lastAtOrBefore<Item>(
  items: readonly Item[],
  t: number,
  keyOf: (item: NoInfer<Item>) => number,
): Item | undefined {
  return items[firstAfter(items, t, keyOf) - 1];
}

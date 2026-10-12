// ---------- util/objects: a set's key toggled, an object updated in place ----------

// a key toggled in a set, or put in (on) or taken out (!on) as asked
export function toggleIn<Key>(set: Set<Key>, key: Key, on = !set.has(key)): void {
  if (on) {
    set.add(key);
  } else {
    set.delete(key);
  }
}
// target given from's values in place, all the way down: each object or array in it that stays one is kept, so whatever holds a part of it
// sees the change (a chain rebuilt from the module it holds); nothing is shared with from. Returns target
export function updateInPlace<T extends object>(target: T, from: T): T {
  const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';
  if (Array.isArray(target)) {
    target.length = (from as unknown[]).length; // the same shape, as T says
  } else {
    for (const k of Object.keys(target)) {
      if (!Object.hasOwn(from, k)) {
        delete (target as Record<string, unknown>)[k];
      }
    }
  }
  for (const [k, v] of Object.entries(from)) {
    const was = (target as Record<string, unknown>)[k];
    (target as Record<string, unknown>)[k] =
      isObject(v) && isObject(was) && Array.isArray(v) === Array.isArray(was) ?
        updateInPlace(was, v)
      : structuredClone(v);
  }
  return target;
}

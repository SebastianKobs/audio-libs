// ---------- util/objects: a key toggled, a map's entry made when asked, an object updated or frozen ----------

// a map as entryOf() asks it: a Map, or a WeakMap
interface Keyed<Key, Value> {
  has(key: Key): boolean;
  get(key: Key): Value | undefined;
  set(key: Key, value: Value): unknown;
}

// a key toggled in a set, or put in (on) or taken out (!on) as asked
export function toggleIn<Key>(set: Set<Key>, key: Key, on = !set.has(key)): void {
  if (on) {
    set.add(key);
  } else {
    set.delete(key);
  }
}
// a map's entry for a key, made by make() the first time it's asked for
export function entryOf<Key, Value>(map: Keyed<Key, Value>, key: Key, make: () => Value): Value {
  if (!map.has(key)) {
    map.set(key, make());
  }
  return map.get(key)!; // made just above, if it wasn't there
}
// target given from's values in place, all the way down: each object or array in it that stays one is kept, so whatever holds a part of it
// sees the change (a chain planned again from the module it holds); nothing is shared with from. Returns target
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
// data frozen all the way down, so a write throws (every module is strict); a module's namespace can't be frozen, and needn't be: nobody
// can write its exports (out of the themes in Z2). Returns data
export function frozen<T extends object>(data: T): T {
  for (const v of Object.values(data)) {
    if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
      frozen(v);
    }
  }
  return (data as { [Symbol.toStringTag]?: unknown })[Symbol.toStringTag] === 'Module' ? data : Object.freeze(data);
}

// ---------- util: small helpers shared by every package ----------
// Its parts:
//   - maths (maths.ts);
//   - where a time falls in a list rising by its key (search.ts), and things due at a time, an item put in time order among others (due.ts);
//   - events (events.ts), and messages as values on a bus (bus.ts);
//   - a set's key toggled, a map's entry made when first asked for, a chain of keys followed through a map, an object updated in place, data compared (objects.ts);
//   - a seeded generator, an item picked from a list or by its weight, draws kept to draw again, a seeded source of draws (random.ts);
//   - values kept live by name, copies of their start, each set told (live-copies.ts);
//   - an address, a path of names, and as text (address.ts).
export {
  approach,
  clamp,
  clamp01,
  modulo,
  SETTLED,
  stepToward,
  wrapAngle,
  easeOut,
  smoothstep,
  wrapToTile,
} from './maths.ts';
export { firstAfter, lastAtOrBefore, valueAt } from './search.ts';
export { DueQueue, placeInOrder } from './due.ts';
export { Events } from './events.ts';
export { Bus } from './bus.ts';
export { chainFrom, entryOf, frozen, sameData, toggleIn, updateInPlace } from './objects.ts';
export { fromData, type Shape } from './from-data.ts';
export { Draws, keptDraws, pickFrom, pickWeighted, seeded } from './random.ts';
export { LiveCopies } from './live-copies.ts';
export { addressOf, addressText, under, type Address } from './address.ts';

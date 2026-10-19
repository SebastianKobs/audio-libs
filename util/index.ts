// ---------- util: small helpers shared by every package ----------
// Its parts:
//   - maths (maths.ts);
//   - where a time falls in a list rising by its key (search.ts), and things due at a time (due.ts);
//   - events (events.ts), and messages as values on a bus (bus.ts);
//   - a set's key toggled, a map's entry made when first asked for, an object updated in place, data compared (objects.ts);
//   - a seeded generator, an item picked from a list, draws kept to draw again (random.ts);
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
export { firstAfter, lastAtOrBefore } from './search.ts';
export { DueQueue } from './due.ts';
export { Events } from './events.ts';
export { Bus } from './bus.ts';
export { entryOf, frozen, sameData, toggleIn, updateInPlace } from './objects.ts';
export { fromData, type Shape } from './from-data.ts';
export { keptDraws, pickFrom, seeded } from './random.ts';
export { LiveCopies } from './live-copies.ts';
export { addressOf, addressText, under, type Address } from './address.ts';

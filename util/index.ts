// ---------- util: small helpers shared by every package ----------
// Its parts:
//   - maths (maths.ts);
//   - where a time falls in a list rising by its key (search.ts), and things due at a time (due.ts);
//   - events (events.ts);
//   - a set's key toggled, a map's entry made when first asked for, an object updated in place (objects.ts);
//   - a seeded generator, an item picked from a list (random.ts).
export { approach, clamp, clamp01, modulo, SETTLED, wrapAngle, easeOut, smoothstep, wrapToTile } from './maths.ts';
export { firstAfter, lastAtOrBefore } from './search.ts';
export { DueQueue } from './due.ts';
export { Events } from './events.ts';
export { entryOf, frozen, toggleIn, updateInPlace } from './objects.ts';
export { pickFrom, seeded } from './random.ts';

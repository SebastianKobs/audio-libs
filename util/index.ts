// ---------- util: small helpers shared by every package ----------
// Its parts: maths (maths.ts), events (events.ts), a set's key toggled and an object updated in place (objects.ts), a seeded generator
// (random.ts)
export { clamp01, wrapAngle, easeOut, smoothstep, wrapToTile } from './maths.ts';
export { Events } from './events.ts';
export { toggleIn, updateInPlace } from './objects.ts';
export { seeded } from './random.ts';

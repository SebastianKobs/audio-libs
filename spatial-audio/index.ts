// ---------- libs/spatial-audio/: where a sound comes from, and how it's heard from where you listen ----------
// Hearing by distance, on libs/spatial/'s places: a sound's level, top, room and side.
// It imports libs/spatial/ and libs/util/'s maths alone.
// A voice is what sounds; an emitter is where it sounds from: a place, and how long it's needed.
// An emitter hands on what it hears there as values, for its caller to set where it will.
// It knows nothing of the voices heard from it: many can sound from one, or none.
// The caller hands the space:
//   - listener: how far a place is from where you listen, and which side, -1 left to 1 right,
//     so a world that wraps round, or has height, stays the caller's;
//   - settings, read live: range, hearing, falloff, dull, room and limit (model.ts),
//     and width, how far a sound is panned at most.
// It knows no clock: lifetimes and update(t) are in the caller's time.
// It builds nothing: no Web Audio in it.
// Its parts:
//   - the space and its listener (space.ts);
//   - an emitter, which hands on what it hears (emitter.ts);
//   - how a sound is heard at a distance (model.ts).
export { Space } from './space.ts';
export type { Listener } from './space.ts';
export { Emitter } from './emitter.ts';
export type { Law, EmitterOptions, Follower, Hears, HeardValue, When } from './emitter.ts';
export type { Heard, SpaceSettings } from './model.ts';

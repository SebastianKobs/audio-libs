// ---------- spatial/places/wrap-around: a world that wraps round, as a torus does: off one edge, in at the other ----------
// A size for each axis, read live, Infinity where it doesn't wrap
// (a floor's x and z, never y).
// The short way round from one place to another, and its distance.
// The whole worlds to move a place by to its copy nearest another:
// a thing's copy nearest where you look, or where you look back home,
// a floating origin, so no number grows large.
import type { Position } from './position.ts';
import { wrapToTile } from '../../base/util/index.ts';

export class WrapAround {
  readonly #sizes: () => Position;

  constructor(sizes: () => Position) {
    this.#sizes = sizes;
  }
  // the short way round from one place to another
  offset(from: Position, to: Position): Position {
    const sizes = this.#sizes();
    return {
      x: shortWay(to.x - from.x, sizes.x),
      y: shortWay(to.y - from.y, sizes.y),
      z: shortWay(to.z - from.z, sizes.z),
    };
  }
  distance(from: Position, to: Position): number {
    const { x, y, z } = this.offset(from, to);
    return Math.hypot(x, y, z);
  }
  // the whole worlds to move a place by, to its copy nearest another
  toNearest(position: Position, around: Position): Position {
    const sizes = this.#sizes();
    return {
      x: wholeWorlds(position.x - around.x, sizes.x),
      y: wholeWorlds(position.y - around.y, sizes.y),
      z: wholeWorlds(position.z - around.z, sizes.z),
    };
  }
}
// a way along an axis the short way round a world of a size: within half of it either way
function shortWay(way: number, size: number): number {
  if (size === Infinity) {
    return way;
  }
  return wrapToTile(way, size);
}
// the whole worlds that bring a way along an axis within half a world of nothing
function wholeWorlds(way: number, size: number): number {
  const worlds = Math.round(way / size);
  if (size === Infinity || worlds === 0) {
    return 0; // none, not -0
  }
  return -size * worlds;
}

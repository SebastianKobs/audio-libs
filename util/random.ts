// ---------- util/random: a seeded generator, the same run of draws for a seed; a pick from a list; draws kept to draw again ----------
// mulberry32 (Tommy Ettinger's): a 32-bit state, stepped and scrambled at each draw; small and fast, enough for the garden's choices, not
// for anything secret (G0g, mockup/architecture/done.md)

// a generator from a seed: the same seed, the same numbers, each in [0, 1)
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
// an item from a list, each as likely, by the random given; none from an empty list
export function pickFrom<Item>(list: readonly Item[], random: () => number = Math.random): Item | undefined {
  return list[Math.floor(random() * list.length)];
}
// A source of random draws kept as it draws, so a plan made again draws the same (a note's, an FX module's).
// again(): a source handing them back in turn, then fresh ones once they've run out.
export function keptDraws(random: () => number): { random: () => number; again: () => () => number } {
  const drawn: number[] = [];
  return {
    random: () => {
      const draw = random();
      drawn.push(draw);
      return draw;
    },
    again: () => {
      let next = 0;
      return () => {
        next += 1;
        return drawn[next - 1] ?? random();
      };
    },
  };
}

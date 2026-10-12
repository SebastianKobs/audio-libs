// ---------- util/random: a seeded generator, a run of numbers in [0, 1) the same seed repeats ----------
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

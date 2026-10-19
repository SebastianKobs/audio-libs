// ---------- util/random: a seeded generator, the same run of draws for a seed; a pick from a list, each as likely or by its weight; draws kept to draw again; a seeded source of draws, each play a seed of its own ----------
// mulberry32 (Tommy Ettinger's): a 32-bit state, stepped and scrambled at each draw; small and fast, enough for the garden's choices, not
// for anything secret (G0g, mockup/architecture/done.md)

// a play's draws: its seed, and the generator made with it
export interface PlayDraws {
  seed: number;
  random: () => number;
}

const SEEDS = 2 ** 32; // how many seeds there are: mulberry32's state, 32 bits

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
// an item from a list, each as likely as its weight, by the random given; none from an empty list
export function pickWeighted<Item>(
  list: readonly Item[],
  weightOf: (item: Item) => number,
  random: () => number = Math.random,
): Item | undefined {
  const weights = list.map(weightOf);
  const sum = weights.reduce((total, weight) => total + weight, 0);
  let pick = random() * sum;
  for (let i = 0; i < list.length; i++) {
    if ((pick -= weights[i]!) <= 0) {
      return list[i];
    }
  }
  return list.at(-1); // a sum's rounding left over: the last
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

// A source of random draws, seeded as it's made, so a run is drawn again from its seed:
// its own draws (random(), what plays: the conductor's picks, a plant's contour and a tower's rhythm, a visitor's wish),
// and a play's (play()), a seed of its own drawn from it,
// with a generator made from that seed, so a play is drawn again from its seed alone;
// seeded again from the start (reseed()).
export class Draws {
  #random: () => number;

  constructor({ seed }: { seed: number }) {
    this.#random = seeded(seed);
  }
  // a draw of the garden's own, in [0, 1)
  random(): number {
    return this.#random();
  }
  // a play's own seed, drawn from the garden's, and its generator
  play(): PlayDraws {
    const seed = Math.floor(this.#random() * SEEDS);
    return { seed, random: seeded(seed) };
  }
  // seeded again, as from the start: the tests' and the recorders', a case at a time, on one garden whose frames run on between them
  reseed(seed: number): void {
    this.#random = seeded(seed);
  }
}

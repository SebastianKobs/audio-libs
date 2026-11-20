// ---------- libs/dsp/oscillators/operator-algorithms: which operators modulate which, and which are heard ----------

/** One algorithm: the operators that modulate each operator, and the operators heard. */
export interface OperatorAlgorithm {
  // routes[k - 1]: the operators that modulate operator k, each a higher one
  readonly routes: readonly (readonly number[])[];
  // the operators whose output is the sound
  readonly carriers: readonly number[];
}

/**
 * The eight algorithms, by number 1 to 8 less one; the feedback is always on operator 4.
 * From memory of the DX21's chart (only 3 is in research/detroit-machine-sounds.md, 6):
 * to check against the TX81Z's manual, built as written meanwhile.
 */
export const OPERATOR_ALGORITHMS: readonly OperatorAlgorithm[] = [
  { routes: [[2], [3], [4], []], carriers: [1] },
  { routes: [[2], [3, 4], [], []], carriers: [1] },
  { routes: [[2, 4], [3], [], []], carriers: [1] },
  { routes: [[2, 3], [], [4], []], carriers: [1] },
  { routes: [[2], [], [4], []], carriers: [1, 3] },
  { routes: [[4], [4], [4], []], carriers: [1, 2, 3] },
  { routes: [[], [], [4], []], carriers: [1, 2, 3] },
  { routes: [[], [], [], []], carriers: [1, 2, 3, 4] },
];

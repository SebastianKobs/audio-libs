// ---------- dsp/operator-levels: a DX's levels as a kernel's numbers (its entry) ----------
// Its parts:
//   - operator-levels.ts: the 0 to 99 level as a modulation index, and the 0 to 7 feedback as a share.
export {
  fourOperatorIndex,
  operatorFeedback,
  sixOperatorIndex,
  TOTAL_LEVEL_UNDER_20,
  totalLevel,
} from './operator-levels.ts';

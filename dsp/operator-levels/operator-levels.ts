// ---------- libs/dsp/operator-levels/operator-levels: a DX's 0 to 99 as a modulation index, its feedback as a share ----------
// An FM operator kernel takes a modulator's level in radians.
// The published patches give Yamaha's 0 to 99 and a feedback of 0 to 7:
// these turn them into the kernel's numbers.
//   - total level: 99 less the level from 20 up; under 20 Dexed's table (`levellut` in source/msfa/env.cc, taken from 127);
//   - index: the chip's top at total level 0, 0.75 dB (2^(1/8)) down a step. The DX7's top is Chowning and Bristow's
//     π·2^(33/16) = 13.1227 rad (sites.google.com/site/yalaorg, "easy dx7 shortcut", tables it); the four-operator chips' 8π is one forum
//     post's (yamahamusicians.com, thread 7030), to check against the chip's manual: used as written meanwhile;
//   - feedback: Dexed's `fb_shift_ = 8 - feedback` (dx7note.cc), the mean of the last two outputs shifted by it: 2^(feedback - 8).
//     The four-operator chips' table (π/16 at 1 to 4π at 7) over their top of 8π gives the same share.
// A DX100's or TX81Z's level is taken to map to total level as a DX7's does: assumed.

const ENTRIES_UNDER_20 = 20;
const STEP_BITS = 8; // total level steps to a halving of the index: 0.75 dB a step

// the total level of levels 0 to 19: 127 less Dexed's `levellut` (0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46)
export const TOTAL_LEVEL_UNDER_20: readonly number[] = [
  127, 122, 118, 114, 110, 107, 104, 102, 100, 98, 96, 94, 92, 90, 88, 86, 85, 84, 82, 81,
];

// the six-operator DX7's index at level 99, radians
const SIX_OPERATOR_TOP = Math.PI * 2 ** (33 / 16);
// the four-operator DX100's and TX81Z's, radians
const FOUR_OPERATOR_TOP = 8 * Math.PI;

// a level 0 to 99 as the chip's total level, 0 the loudest
export function totalLevel(level: number): number {
  if (level >= ENTRIES_UNDER_20) {
    return 99 - level;
  }
  return TOTAL_LEVEL_UNDER_20[Math.max(0, Math.round(level))]!;
}

// a modulator's level 0 to 99 on a DX7, as its index in radians
export function sixOperatorIndex(level: number): number {
  return indexOf(SIX_OPERATOR_TOP, level);
}

// a modulator's level 0 to 99 on a DX100 or a TX81Z, as its index in radians
export function fourOperatorIndex(level: number): number {
  return indexOf(FOUR_OPERATOR_TOP, level);
}

function indexOf(top: number, level: number): number {
  return top * 2 ** (-totalLevel(level) / STEP_BITS);
}

// a feedback 0 to 7 as the kernel's share of the operator's own output (in radians, level in): 0 at 0, else 2^(feedback - 8)
export function operatorFeedback(feedback: number): number {
  if (feedback === 0) {
    return 0;
  }
  return 2 ** (feedback - 8);
}

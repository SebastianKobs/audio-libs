// ---------- plan/effects/ducking: a Ducker's level, as the kicks dip it ----------
// From the kicks' times, scheduled ahead as the notes are: at each kick down to what its depth leaves, by its attack;
// from there back to 1, by its release. Each a glide (a target), so nothing jumps, however close two kicks come: a kick
// in the middle of a release dips from where that release got to.
// Times as the caller's: the audio's, to automate a Ducker's level from 0.
import type { Automation } from '../../../base/automation/index.ts';

// how a kick dips it: the share taken away (0 none, 1 silent at the bottom), and how long down and back, in s
export interface Ducking {
  readonly depth: number;
  readonly attack: number;
  readonly release: number;
}

const SETTLES = 3; // time constants a glide takes to get most of the way, 95 %: an attack or a release its time

// the level's automation for these kicks
export function duckEvents(kicks: readonly number[], { depth, attack, release }: Ducking): Automation[] {
  const floor = 1 - Math.min(1, Math.max(0, depth));
  return kicks.flatMap((at): Automation[] => [
    ['target', floor, at, attack / SETTLES],
    ['target', 1, at + attack, release / SETTLES],
  ]);
}

// A grid for the clip tests: 0.2 s 16ths from 0, its odd ones swung late by 0.05 s, in 4/4, as the clock's grid answers.
import { STEP } from '../../clock/index.ts';

export const SIXTEENTH = 0.2;
export const SWING = 0.05;

export const swungGrid = {
  meter: () => [4, 4],
  stepDuration: () => SIXTEENTH,
  swingAt: (i) => (i % 2 ? SWING : 0),
  timeAt: (place) => {
    const i = Math.floor(place);
    return i * SIXTEENTH + (i % 2 ? SWING : 0) + (place - i) * SIXTEENTH;
  },
  secondsOf: (ticks) => (ticks / STEP) * SIXTEENTH,
};

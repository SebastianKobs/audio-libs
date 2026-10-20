// ---------- build/track-channels/change: a change to a param, and when it lands ----------
import type { TimedValue, When } from '../../automation/index.ts';
import type { Address } from '../../plan/format/index.ts';

// a change to a param by its address: its value, when it lands, its glide's time constant if any
export interface Change extends TimedValue {
  readonly address: Address;
}
// the clock a change's time is on, and the audio's clock a time on it is played on
interface Clocks {
  now: number;
  at: (t: number) => number;
}

// When a change lands on the audio's clock: at its time if it's to come, else now;
// gliding there by its time constant where it says.
export function whenOf({ t, glide }: Pick<Change, 't' | 'glide'>, { now, at }: Clocks): When {
  const atTime = t > now ? { at: at(t) } : {};
  if (glide === undefined) {
    return atTime;
  }
  return { ...atTime, glide };
}

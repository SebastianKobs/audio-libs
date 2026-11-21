// ---------- view/device/models/meters: a level bar's fall. Pure ----------
// How a meter moves over time, its ballistics, apart from how it's drawn (modular-audio/view/device/dom/):
// a level bar's fall, as a DIN peak meter's, each bar's level kept by its key (Meters).
// The limiter's history beside it (limiter-history.ts).
// The sound system measures its peaks without them (the builder's meter, modular-audio/build/web-audio/).
import { gainOf, SILENCE } from '../../../../base/params/index.ts';

const FALL_RATE = 20 / 1.5; // dB a second, a DIN peak meter's: 20 dB in 1.5 s

// A meter's fall, as a DIN peak meter's: up at once to the peak, back down 20 dB in 1.5 s.
// Levels as gains, 1 full scale; dt in s.
export function meterFall(shown: number, peak: number, dt: number): number {
  const fallen = shown * gainOf(-FALL_RATE * dt);
  return Math.max(peak, fallen < SILENCE ? 0 : fallen);
}

// Each level bar's level, by the key its level is read by, falling as meterFall() has it.
export class Meters {
  readonly #levels = new Map<string, number>();

  // a bar's level now; 0 for one never heard
  of(key: string): number {
    return this.#levels.get(key) ?? 0;
  }
  // a bar's level after dt s, its peak heard now: kept, and handed back
  fall(key: string, peak: number, dt: number): number {
    const level = meterFall(this.of(key), peak, dt);
    this.#levels.set(key, level);
    return level;
  }
}

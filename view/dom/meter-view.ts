// ---------- view/dom/meter-view: a level bar, its fall, and where a level shows on it ----------
// What a view draws of a meter; the sound system measures its peaks without them (the
// builder's meter, libs/build/web-audio/). A strip's bar, and the limiter's history.
import { clamp01 } from '../../util/index.ts';
import { dBOf, gainOf, SILENCE } from '../../params/index.ts';
import { html, type Html } from './elements.ts';

// a meter's fall, as a DIN peak meter's: up at once to the peak, back down 20 dB in 1.5 s. Levels as gains, 1 full scale; dt in s
export function meterFall(shown: number, peak: number, dt: number, fall = 20 / 1.5): number {
  const fallen = shown * gainOf(-fall * dt);
  return Math.max(peak, fallen < SILENCE ? 0 : fallen);
}
// where a level shows on a meter, 0 to 1: even in dB, as a console's peak meter, aligned to digital as EBU R68 does, -18 dBFS its 0 VU at
// two thirds, where a fader has its unity mark; full scale at the top, so the headroom above shows; -54 dB at the bottom
export function meterPosition(level: number): number {
  return level > 0 ? clamp01(1 + dBOf(level) / 54) : 0;
}
// A level bar beside a fader, by the name its level is read by; red where it's at full scale.
export function meterHtml(name: string, level: number): Html {
  return html`<i class="meter${level >= 1 ? ' over' : ''}" data-meter="${name}" style="--m:${meterPosition(level)}"></i>`;
}

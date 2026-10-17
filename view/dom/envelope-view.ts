// ---------- view/dom/envelope-view: an envelope's curve drawn ----------
// As SVG, from its drawing (libs/view/models/'s envelopeDrawing()):
//   - its line, and the area under it, a level of 1 at its top;
//   - its delay's end dotted, where its attack starts;
//   - the note's end dashed, none for a trigger's.
// Every curve at one time scale, so a short one is short and a long one runs on, a scroll away.
import type { EnvelopeDrawing } from '../models/index.ts';
import { html, type Html } from './elements.ts';

const PER_SECOND = 60; // px across for a second
const HEIGHT = 40; // px

// An envelope's curve drawn as SVG.
export function envelopeHtml({ levels, step, delay, noteOff }: EnvelopeDrawing): Html {
  const width = xOf((levels.length - 1) * step);
  const line = levels.map((level, index) => `${xOf(index * step)},${yOf(level)}`).join(' ');
  const area = `0,${HEIGHT} ${line} ${width},${HEIGHT}`;
  const delayMark = delay > 0 ? markHtml('delay', delay) : html``;
  const offMark = noteOff === null ? html`` : markHtml('off', noteOff);
  return html`<svg class="envelope-curve" viewBox="0 0 ${width} ${HEIGHT}" width="${width}" height="${HEIGHT}" preserveAspectRatio="none"><polygon class="area" points="${area}"></polygon><polyline class="line" points="${line}"></polyline>${delayMark}${offMark}</svg>`;
}

// a time marked by a line top to bottom
function markHtml(kind: string, t: number): Html {
  const x = xOf(t);
  return html`<line class="${kind}" x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}"></line>`;
}
// a time across, rounded to a tenth of a pixel
function xOf(t: number): number {
  return Math.round(t * PER_SECOND * 10) / 10;
}
// a level up from the bottom, rounded to a tenth of a pixel
function yOf(level: number): number {
  return Math.round((1 - level) * HEIGHT * 10) / 10;
}

// ---------- view/device/dom/matrix-view: a matrix drawn, what moves what ----------
// As a synth's mod matrix, one table, a row a source and what it moves:
//   - a macro's how much its map: its factor, its offset where it has one, its ends;
//   - a modulator's its reach, a knob of its own, set here where it's live.
import type { MacroTarget } from '../../../plan/format/index.ts';
import { Knob, type Control, type MatrixRow } from '../models/index.ts';
import { html, type Html } from '../../../../base/html/index.ts';
import { knobHtml } from './knob-view.ts';

// A matrix drawn: its heads, then a row each.
export function matrixHtml(rows: readonly MatrixRow[], { hintOf }: { hintOf: (control: Control) => string }): Html {
  const cells = rows.map(({ source, target, map, amount }) => {
    const howMuch = amount instanceof Knob ? knobHtml(amount.name, amount, { title: hintOf(amount) }) : mapHtml(map);
    return html`<span>${source}</span><span>${target}</span>${howMuch}`;
  });
  return html`<div class="matrix"><span class="head">source</span><span class="head">moves</span><span class="head">by</span>${cells}</div>`;
}

// a map as text: its factor, its offset where it has one, its ends where it has them
function mapHtml(map: Omit<MacroTarget, 'to'> | undefined): Html {
  if (!map) {
    return html`<span class="map"></span>`;
  }
  const { factor, offset, low, high } = map;
  const parts = [`×${factor}`];
  if (offset) {
    parts.push(offset > 0 ? `+${offset}` : `−${-offset}`);
  }
  if (low !== undefined) {
    parts.push(`≥ ${low}`);
  }
  if (high !== undefined) {
    parts.push(`≤ ${high}`);
  }
  return html`<span class="map">${parts.join(' ')}</span>`;
}

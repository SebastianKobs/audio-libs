// ---------- view/dom/limiter-view: the limiter's view of its own, its history and what it takes away now ----------
// Registered for the Limiter's kind, drawn before its knobs: more than its params show.
// As FabFilter's Pro-L shows them:
//   - what it takes away now, in dB;
//   - its history: what comes out, and on it, in red, what it cut, up to what went in after
//     its gain, scrolling right to left, on the meters' scale (meterPosition()), its ceiling a
//     line.
// Its levels and its reduction read from the limiter block inside the device, by its address.
import { gainOf } from '../../params/index.ts';
import { addressOf, addressText, type Address } from '../../plan/format/index.ts';
import { Knob, type Device, type ViewBuilder } from '../models/index.ts';
import { sizedCanvas } from './canvas.ts';
import { html, type Html } from './elements.ts';
import { meterPosition } from './meter-view.ts';

// a column's: the loudest in and out, and the most it took away
type Peaks = { in: number; out: number; gr: number };
// What it's drawn with, the view's: the colors of what comes out and of its ceiling; this
// frame's step in seconds, what its history scrolls by.
export interface LimiterLook {
  colors(): { readonly accent: string; readonly soft: string };
  frameStep(): number;
}

// px, and s of it each 1 px column holds, the loudest of its frames: 6 s
const HISTORY = { width: 236, height: 90, column: 0.025 };
// the limiter block inside the Limiter, its levels' and reduction's
const BLOCK = 'limiter';
const HISTORY_HINT =
  "The last 6 seconds, on the meters' scale. Bright: what comes out of the limiter. Red, on it: what it cut, up to what went in after its gain. The line: its ceiling.";

// The limiter's view of its own: drawn before its knobs (html()), started once it's in the page
// (attach()), and drawn on every frame while its device is open (draw()).
export class LimiterView {
  readonly #views: ViewBuilder;
  readonly #look: LimiterLook;
  readonly #live = new Set<() => boolean>(); // what draws on every frame while its device is open

  constructor({ views, look }: { views: ViewBuilder; look: LimiterLook }) {
    this.#views = views;
    this.#look = look;
  }
  // its history, and what it takes away now, each marked with its device's address
  html(device: Device): Html {
    const key = addressText(device.address);
    return html`<canvas class="history" data-limiter="${key}" title="${HISTORY_HINT}"></canvas><div class="reading" title="What the limiter takes away now, in dB."><span>reduction (dB)</span><b data-reduction="${key}">0.00</b></div>`;
  }
  // once drawn within an element: its history drawn on every frame while it's there
  attach(within: Element): void {
    for (const canvas of within.querySelectorAll<HTMLCanvasElement>('canvas[data-limiter]:not([data-drawn])')) {
      canvas.dataset.drawn = '';
      this.#live.add(this.#history(canvas, addressOf(canvas.dataset.limiter!))); // marked with it
    }
  }
  // what draws on every frame while its device is open: its history, what it takes away now
  draw(): void {
    for (const draw of this.#live) {
      if (!draw()) {
        this.#live.delete(draw);
      }
    }
    for (const reading of document.querySelectorAll<HTMLElement>('[data-reduction]')) {
      const block = [...addressOf(reading.dataset.reduction!), BLOCK]; // marked with it
      reading.textContent = this.#views.readingOf(block, 'reduction').toFixed(2);
    }
  }
  // the history's columns, one pushed each `column` s of the clock's frames, each the loudest of them, drawn on every frame
  #history(canvas: HTMLCanvasElement, device: Address): () => boolean {
    const views = this.#views;
    const look = this.#look;
    const block = [...device, BLOCK];
    const { width, height, column } = HISTORY;
    const context = sizedCanvas(canvas, HISTORY); // asked once
    const columns = Array.from({ length: width }, (): Peaks => ({ in: 0, out: 0, gr: 0 }));
    let held: Peaks = { in: 0, out: 0, gr: 0 };
    let spent = 0; // the column being gathered
    return () => {
      if (!canvas.isConnected) {
        return false; // its device closed: no more drawing
      }
      held = {
        in: Math.max(held.in, views.peakOf(block, 'in')),
        out: Math.max(held.out, views.peakOf(block, 'out')),
        gr: Math.max(held.gr, views.readingOf(block, 'reduction')),
      };
      for (spent += look.frameStep(); spent >= column; spent -= column) {
        columns.shift();
        columns.push(held);
        held = { in: 0, out: 0, gr: 0 };
      }
      const { accent, soft } = look.colors();
      context.clearRect(0, 0, width, height);
      drawColumns(context, columns, accent);
      drawCeiling(context, this.#ceiling(device), soft);
      return true;
    };
  }
  // its ceiling as it plays, in dBFS
  #ceiling(device: Address): number {
    const ceiling = this.#views.control([...device, 'ceiling']);
    return ceiling instanceof Knob ? ceiling.value : 0;
  }
}
// each column: what came out, and on it, in red, what it cut
function drawColumns(context: CanvasRenderingContext2D, columns: Peaks[], color: string): void {
  const { height } = HISTORY;
  columns.forEach((peaks, pixel) => {
    const out = height * meterPosition(peaks.out);
    const cut = height * meterPosition(peaks.in) - out;
    context.fillStyle = color;
    context.fillRect(pixel, height - out, 1, out); // out
    if (peaks.gr > 0.1 && cut > 0) {
      context.fillStyle = '#E0857F';
      context.fillRect(pixel, height - out - cut, 1, cut);
    } // cut: on what came out, up to what went in
  });
}
// the ceiling, a line across
function drawCeiling(context: CanvasRenderingContext2D, ceiling: number, color: string): void {
  const { width, height } = HISTORY;
  const ceilingY = Math.round(height * atLevel(ceiling)) + 0.5;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, ceilingY);
  context.lineTo(width, ceilingY);
  context.stroke();
}
function atLevel(dBFS: number): number {
  return 1 - meterPosition(gainOf(dBFS)); // a level's height, from the top, 0 to 1
}

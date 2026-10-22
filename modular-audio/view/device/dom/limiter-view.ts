// ---------- view/device/dom/limiter-view: the limiter's view of its own, its history and what it takes away now ----------
// Registered for the Limiter's kind, drawn before its knobs: more than its params show.
// As FabFilter's Pro-L shows them:
//   - what it takes away now, in dB;
//   - its history: what comes out, and on it, in red, what it cut, up to what went in after
//     its gain, scrolling right to left, on the meters' scale (meterPosition()), its ceiling a
//     line.
// Its levels and its reduction read from the limiter block inside the device, by its address;
// its history's columns a model's (LimiterHistory, libs/modular-audio/view/device/models/meters.ts).
import { gainOf } from '../../../../base/params/index.ts';
import type { Address } from '../../../../base/util/index.ts';
import { Knob, LimiterHistory, type Device, type Peaks, type ViewBuilder } from '../models/index.ts';
import type { CustomView } from './custom-view.ts';
import { html, sizedCanvas, type Html } from '../../../../base/html/index.ts';
import { meterPosition } from './meter-view.ts';

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

// The limiter's view of its own: drawn before its knobs (html()), and once it's in the page
// (shown()), its history and what it takes away now drawn on every frame while it's there.
export class LimiterView implements CustomView {
  readonly #views: ViewBuilder;
  readonly #look: LimiterLook;

  constructor({ views, look }: { views: ViewBuilder; look: LimiterLook }) {
    this.#views = views;
    this.#look = look;
  }
  // its history, and what it takes away now, marked
  html(): Html {
    return html`<canvas class="history" title="${HISTORY_HINT}"></canvas><div class="reading" title="What the limiter takes away now, in dB."><span>reduction (dB)</span><b data-reduction>0.00</b></div>`;
  }
  // Once in the page, what draws on every frame while it's there: its history, what it takes
  // away now.
  shown(within: Element, device: Device): () => boolean {
    const canvas = within.querySelector<HTMLCanvasElement>('canvas.history')!; // drawn with its controls
    const reading = within.querySelector<HTMLElement>('[data-reduction]')!;
    const history = this.#history(canvas, device.address);
    const block = [...device.address, BLOCK];
    return () => {
      reading.textContent = this.#views.readingOf(block, 'reduction').toFixed(2);
      return history();
    };
  }
  // the history, a column each `column` s of the clock's frames, its model's; drawn on every frame
  #history(canvas: HTMLCanvasElement, device: Address): () => boolean {
    const views = this.#views;
    const look = this.#look;
    const block = [...device, BLOCK];
    const { width, height, column } = HISTORY;
    const context = sizedCanvas(canvas, HISTORY); // asked once
    const history = new LimiterHistory({ columns: width, column });
    return () => {
      if (!canvas.isConnected) {
        return false; // its device closed: no more drawing
      }
      const peaks = {
        in: views.peakOf(block, 'in'),
        out: views.peakOf(block, 'out'),
        gr: views.readingOf(block, 'reduction'),
      };
      history.heard(peaks, look.frameStep());
      const { accent, soft } = look.colors();
      context.clearRect(0, 0, width, height);
      drawColumns(context, history.columns, accent);
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
function drawColumns(context: CanvasRenderingContext2D, columns: readonly Peaks[], color: string): void {
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

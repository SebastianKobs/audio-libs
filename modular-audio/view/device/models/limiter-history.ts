// ---------- view/device/models/limiter-history: the limiter's history. Pure ----------
// As FabFilter's Pro-L keeps it, apart from how it's drawn (libs/modular-audio/view/device/dom/limiter-view.ts):
// a column each interval, the loudest of its frames, what went in, what came out and what it
// took away.

// A history column's: the loudest in and out, and the most taken away, in dB.
export interface Peaks {
  readonly in: number;
  readonly out: number;
  readonly gr: number;
}

const SILENT: Peaks = Object.freeze({ in: 0, out: 0, gr: 0 });

// The limiter's history, oldest first: a column pushed each `column` s of the frames heard,
// each the loudest of them, the oldest let go; silent at first.
export class LimiterHistory {
  readonly #columns: Peaks[];
  readonly #column: number;
  #held: Peaks = SILENT; // the column being gathered
  #spent = 0; // its s so far

  // columns: how many it keeps; column: the s each holds
  constructor({ columns, column }: { columns: number; column: number }) {
    this.#columns = Array.from({ length: columns }, () => SILENT);
    this.#column = column;
  }
  get columns(): readonly Peaks[] {
    return this.#columns;
  }
  // A frame's peaks, dt s of it: held as the loudest so far, pushed once its interval is spent;
  // a long frame its peaks in one column, then silence.
  heard(peaks: Peaks, dt: number): void {
    this.#held = {
      in: Math.max(this.#held.in, peaks.in),
      out: Math.max(this.#held.out, peaks.out),
      gr: Math.max(this.#held.gr, peaks.gr),
    };
    for (this.#spent += dt; this.#spent >= this.#column; this.#spent -= this.#column) {
      this.#columns.shift();
      this.#columns.push(this.#held);
      this.#held = SILENT;
    }
  }
}

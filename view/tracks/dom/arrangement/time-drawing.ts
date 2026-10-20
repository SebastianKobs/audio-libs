// ---------- view/tracks/dom/arrangement/time-drawing: the arrangement's time on its canvases: the bar ruler, the rows, the regions and the playhead ----------
import type { Arrangement, PlacedLane, PlacedRegion, Row } from '../../models/index.ts';
import { sizedCanvas } from '../../../html/index.ts';
import { drawNotes, type DrawnNote } from './note-drawing.ts';
import { drawLane, type DrawnLane } from './lane-drawing.ts';
import { xOf } from './pixels.ts';
// a region as drawn, in view: its row, its label, where it starts and how wide, px, whether it's greyed, gone, and its notes, what the
// browser tests read (drawn())
export interface DrawnRegion {
  row: string;
  label: string;
  x: number;
  width: number;
  gone: boolean;
  notes: DrawnNote[];
}
// what a look draws: the rows, the regions on them, the opened lanes (G5b), the playhead's place where it's set back (P2), the time in
// view, its places at its left and right edges, where a time lies on the grid, and now
export interface Look {
  rows: readonly Row[];
  placed: readonly PlacedRegion[];
  lanes: readonly PlacedLane[];
  playhead: number | null;
  left: number;
  right: number;
  map: Arrangement['map'];
  now: number;
}
// The colors it draws with, handed in, by its owner:
//   - strip: its ground; line: a bar's line, a row's;
//   - clip: a region played back; live: a region played live;
//   - text, soft: a label, a bar's number and the notes;
//   - accent: the present, the playhead and a lane's line.
export type ArrangementColors = Record<'strip' | 'line' | 'clip' | 'live' | 'text' | 'soft' | 'accent', string>;
type Colors = ArrangementColors;

const HEADER_HEIGHT = 16; // px: a group's header row, as the names' (index.html)
const ROW_HEIGHT = 34; // px: a track's, as the names': its label above its notes (G4b, Default)
const LANE_HEIGHT = 24; // px: a lane's, as the names' (G5a, Default)
const LABEL_HEIGHT = 12; // px: a region's label, its notes below it
const RULER_HEIGHT = 18; // px
const GONE_ALPHA = 0.35; // a region whose clip is gone, greyed
const LANE_ALPHA = 0.12; // a lane's ground, under its track's (G5a)
const LANE_PAD = 4; // px: a lane's line kept off its row's edges (G5b)
const MARKER = 4; // px: half the playhead's triangle in the ruler (P2)

// the time drawn, only what's in view: the bar ruler above, numbered from the grid's first bar; the rows, a header's a band, a lane's a
// fainter one (G5a), its line on it (G5b); each region a
// block on its row from its first note to the end of its last, an open one to the playhead, labelled with its clip, its notes below its
// label, greyed once its clip is gone (G4b); the present, now, a line; the playhead where it's set back, a triangle in the ruler and a
// dashed line (P2). What it drew kept for the browser tests
export class TimeDrawing {
  readonly #ruler: HTMLCanvasElement;
  readonly #rows: HTMLCanvasElement;
  readonly #colors: () => Colors;
  #drawn: DrawnRegion[] = [];
  #lanes: DrawnLane[] = [];
  #present = 0; // its x
  #playhead: number | null = null; // its x, where it's set back (P2)

  // colors: its owner's, read as it draws
  constructor({ ruler, rows, colors }: { ruler: HTMLCanvasElement; rows: HTMLCanvasElement; colors: () => Colors }) {
    this.#ruler = ruler;
    this.#rows = rows;
    this.#colors = colors;
  }
  get drawn(): readonly DrawnRegion[] {
    return this.#drawn;
  }
  get lanes(): readonly DrawnLane[] {
    return this.#lanes;
  }
  get present(): number {
    return this.#present;
  }
  get playhead(): number | null {
    return this.#playhead;
  }
  draw(look: Look): void {
    const colors = this.#colors();
    const ruler = sized(this.#ruler, RULER_HEIGHT);
    const rows = sized(this.#rows, heightOf(look.rows));
    this.#drawRuler(ruler, look, colors);
    const tops = rowTops(look.rows);
    drawRowBands(rows, look.rows, colors);
    this.#drawn = look.placed.flatMap((placed) => this.#drawRegion(rows, placed, tops, look, colors));
    this.#lanes = look.lanes.flatMap((lane) => this.#drawLane(rows, lane, tops, look, colors));
    this.#present = xOf(look.map.placeOf(look.now), look.left);
    drawPresent(ruler, rows, this.#present, colors);
    this.#playhead = look.playhead === null ? null : xOf(look.playhead, look.left);
    if (this.#playhead !== null) {
      drawPlayhead(ruler, rows, this.#playhead, colors);
    }
  }
  // the bars in view, each a line and its number, from 1
  #drawRuler(ruler: CanvasRenderingContext2D, { left, right, map }: Look, colors: Colors): void {
    const bar = map.stepsPerBar();
    clear(ruler, colors);
    ruler.font = '10px ui-rounded, system-ui, sans-serif';
    for (let place = Math.floor(left / bar) * bar; place <= right; place += bar) {
      const x = xOf(place, left);
      ruler.fillStyle = colors.line;
      ruler.fillRect(Math.round(x), 0, 1, RULER_HEIGHT);
      ruler.fillStyle = colors.soft;
      ruler.fillText(String(place / bar + 1), x + 3, RULER_HEIGHT - 5);
    }
  }
  // a lane's line on its row, if its row shows (G5b)
  #drawLane(
    rows: CanvasRenderingContext2D,
    lane: PlacedLane,
    tops: ReadonlyMap<string, number>,
    look: Look,
    colors: Colors,
  ): DrawnLane[] {
    const top = tops.get(lane.row);
    if (top === undefined) {
      return [];
    }
    const area = { top: top + LANE_PAD, height: LANE_HEIGHT - 2 * LANE_PAD };
    return [drawLane(rows, lane, area, look, colors.accent)];
  }
  // a region on its row, if its row shows and it's in view: its block, its label and its notes, greyed if it's gone
  #drawRegion(
    rows: CanvasRenderingContext2D,
    placed: PlacedRegion,
    tops: ReadonlyMap<string, number>,
    look: Look,
    colors: Colors,
  ): DrawnRegion[] {
    const { left, map, now } = look;
    const top = tops.get(placed.row);
    const x = xOf(map.placeOf(placed.from), left);
    const width = Math.max(2, xOf(map.placeOf(Math.min(placed.to, now)), left) - x);
    if (top === undefined || x > rows.canvas.clientWidth || x + width < 0) {
      return [];
    }
    rows.save();
    rows.globalAlpha = placed.gone ? GONE_ALPHA : 1;
    rows.fillStyle = placed.live ? colors.live : colors.clip;
    rows.fillRect(x, top + 2, width, ROW_HEIGHT - 4);
    rows.beginPath();
    rows.rect(x, top, width, ROW_HEIGHT);
    rows.clip();
    rows.fillStyle = colors.text;
    rows.font = '10px ui-rounded, system-ui, sans-serif';
    rows.fillText(placed.label, Math.max(x, 0) + 4, top + LABEL_HEIGHT);
    const area = { top: top + LABEL_HEIGHT + 3, height: ROW_HEIGHT - LABEL_HEIGHT - 7 };
    const notes = drawNotes(rows, placed.notes, area, look, colors.soft);
    rows.restore();
    return [{ row: placed.row, label: placed.label, x, width, gone: placed.gone, notes }];
  }
}

// a canvas as wide as it shows, to a height, sharp on any screen, in the arrangement's font
function sized(canvas: HTMLCanvasElement, height: number): CanvasRenderingContext2D {
  const context = sizedCanvas(canvas, { height });
  context.font = '11px ui-rounded, system-ui, sans-serif';
  return context;
}
function clear(context: CanvasRenderingContext2D, colors: Colors): void {
  context.fillStyle = colors.strip;
  context.fillRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
}
// the rows' height
function heightOf(rows: readonly Row[]): number {
  return rows.reduce((height, row) => height + rowHeight(row), 0);
}
// a row's height: a header's, a lane's (G5a) or a track's
function rowHeight(row: Row): number {
  if (row.header) {
    return HEADER_HEIGHT;
  }
  return row.track === undefined ? ROW_HEIGHT : LANE_HEIGHT;
}
// where each track's and lane's row starts, from the top, by its key
function rowTops(rows: readonly Row[]): Map<string, number> {
  const tops = new Map<string, number>();
  let top = 0;
  for (const row of rows) {
    if (!row.header) {
      tops.set(row.key, top);
    }
    top += rowHeight(row);
  }
  return tops;
}
// the rows' ground: a header a band, a lane a fainter one (G5a), a track and a lane a line under it
function drawRowBands(rows: CanvasRenderingContext2D, shown: readonly Row[], colors: Colors): void {
  clear(rows, colors);
  const width = rows.canvas.clientWidth;
  let top = 0;
  for (const row of shown) {
    const height = rowHeight(row);
    rows.fillStyle = colors.line;
    if (row.header || row.track !== undefined) {
      rows.globalAlpha = row.header ? 0.35 : LANE_ALPHA;
      rows.fillRect(0, top, width, height);
      rows.globalAlpha = 1;
    }
    if (!row.header) {
      rows.fillRect(0, top + height - 1, width, 1);
    }
    top += height;
  }
}
// now, a line down the ruler and the rows
function drawPresent(ruler: CanvasRenderingContext2D, rows: CanvasRenderingContext2D, x: number, colors: Colors): void {
  for (const context of [ruler, rows]) {
    context.fillStyle = colors.accent;
    context.fillRect(Math.round(x), 0, 1, context.canvas.clientHeight);
  }
}
// the playhead set back (P2): a small triangle at the ruler's foot, pointing down, and a dashed line down the rows
function drawPlayhead(
  ruler: CanvasRenderingContext2D,
  rows: CanvasRenderingContext2D,
  x: number,
  colors: Colors,
): void {
  const at = Math.round(x) + 0.5;
  ruler.fillStyle = colors.accent;
  ruler.beginPath();
  ruler.moveTo(at - MARKER, RULER_HEIGHT - MARKER - 3);
  ruler.lineTo(at + MARKER, RULER_HEIGHT - MARKER - 3);
  ruler.lineTo(at, RULER_HEIGHT - 1);
  ruler.fill();
  rows.save();
  rows.strokeStyle = colors.accent;
  rows.lineWidth = 1;
  rows.setLineDash([3, 3]);
  rows.beginPath();
  rows.moveTo(at, 0);
  rows.lineTo(at, rows.canvas.clientHeight);
  rows.stroke();
  rows.restore();
}

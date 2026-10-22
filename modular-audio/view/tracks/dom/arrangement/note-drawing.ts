// ---------- view/tracks/dom/arrangement/note-drawing: a region's notes drawn inside its block, each at its pitch (G4b) ----------
import { noteShape, pitchRange, type Arrangement, type NoteShape } from '../../models/index.ts';
import type { RecordedNote } from '../../readout/index.ts';
import { STEP_PX, xOf } from './pixels.ts';

// a note as drawn, what the browser tests read: its first pitch, where it starts and how wide, px, how high, whether it's still held
export interface DrawnNote {
  pitch: number;
  x: number;
  width: number;
  y: number;
  held: boolean;
}
// where a region's notes go in its block: from how far down, and how much room they have, px
export interface NoteArea {
  top: number;
  height: number;
}
// where a time and a pitch are drawn, px
interface Places {
  xOf: (t: number) => number;
  yOf: (pitch: number) => number;
}

const NOTE_HEIGHT = 3; // px: a note's bar
const SLIDE = 1; // 16ths: how long a slide in is drawn, the instrument's own time unknown here (Default)

// a region's notes up to now, each at its pitch, fitted to its area by the region's own range, a lone pitch in its middle: each piece a bar,
// each glide a line between two, a slide in a line into its start
export function drawNotes(
  context: CanvasRenderingContext2D,
  notes: readonly RecordedNote[],
  area: NoteArea,
  { left, map, now }: { left: number; map: Arrangement['map']; now: number },
  color: string,
): DrawnNote[] {
  const range = pitchRange(notes);
  if (!range) {
    return [];
  }
  const places: Places = { xOf: (t) => xOf(map.placeOf(t), left), yOf: (pitch) => yIn(area, range, pitch) };
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 1;
  return notes.flatMap((note) => {
    const shape = noteShape(note, now);
    return shape ? [drawShape(context, shape, places)] : [];
  });
}
function drawShape(context: CanvasRenderingContext2D, shape: NoteShape, { xOf, yOf }: Places): DrawnNote {
  for (const piece of shape.pieces) {
    context.fillRect(xOf(piece.from), yOf(piece.pitch), Math.max(1, xOf(piece.to) - xOf(piece.from)), NOTE_HEIGHT);
  }
  for (const glide of shape.lines) {
    line(context, [xOf(glide.t), yOf(glide.from)], [xOf(glide.t), yOf(glide.to)]);
  }
  if (shape.slide) {
    const { t, from, to } = shape.slide;
    line(context, [xOf(t), yOf(from)], [xOf(t) + SLIDE * STEP_PX, yOf(to)]);
  }
  const first = shape.pieces[0]!; // a shape has its first piece
  const last = shape.pieces.at(-1)!;
  return {
    pitch: first.pitch,
    x: xOf(first.from),
    width: xOf(last.to) - xOf(first.from),
    y: yOf(first.pitch),
    held: shape.held,
  };
}
// a pitch's height in the area: its highest at the top, its lowest at the bottom, a lone pitch in the middle
function yIn(area: NoteArea, [low, high]: [number, number], pitch: number): number {
  const room = area.height - NOTE_HEIGHT;
  if (high === low) {
    return area.top + room / 2;
  }
  return area.top + room * (1 - (pitch - low) / (high - low));
}
// a line through two bars' middles
function line(context: CanvasRenderingContext2D, [x1, y1]: [number, number], [x2, y2]: [number, number]): void {
  context.beginPath();
  context.moveTo(x1, y1 + NOTE_HEIGHT / 2);
  context.lineTo(x2, y2 + NOTE_HEIGHT / 2);
  context.stroke();
}

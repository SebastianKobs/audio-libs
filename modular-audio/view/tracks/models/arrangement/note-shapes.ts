// ---------- view/tracks/models/arrangement/note-shapes: a region's notes as the arrangement draws them, in song time and pitch, up to now ----------
import type { RecordedNote } from '../../readout/index.ts';

// a piece of a note, held at a pitch from when to when
interface Piece {
  from: number;
  to: number;
  pitch: number;
}
// a note's move from one pitch to another at a time: a glide between its pieces, or its slide in at its start
interface Move {
  t: number;
  from: number;
  to: number;
}
// a note's shape: its pieces, a piece at each pitch it glides to; a line for each glide; its slide in, if it has a bend; whether it's
// still held
export interface NoteShape {
  pieces: Piece[];
  lines: Move[];
  slide: Move | null;
  held: boolean;
}

// a note's shape up to now: held at its pitch from its start to its end, one still held, or still sounding, to now; a piece at each pitch
// it has glided to by now, a line between them at the glide's time; a slide in from its bend at its start; none for a note that hasn't
// sounded yet, or that has no pitch
export function noteShape(note: RecordedNote, now: number): NoteShape | null {
  if (note.pitch === undefined || note.t > now) {
    return null;
  }
  const held = note.duration === undefined;
  const end = held ? now : Math.min(now, note.t + note.duration!); // with its length, as just asked
  const turns = (note.lanes?.pitch ?? []).filter(({ t }) => t > note.t && t < end);
  const starts: [at: number, pitch: number][] = [
    [note.t, note.pitch],
    ...turns.map(({ t, value }): [number, number] => [t, value]),
  ];
  const pieces = starts.map(([from, pitch], index) => ({ from, to: starts[index + 1]?.[0] ?? end, pitch }));
  const lines = pieces.slice(1).map((piece, index) => ({ t: piece.from, from: pieces[index]!.pitch, to: piece.pitch }));
  const bend = note.controllers?.bend ?? 0;
  const slide = bend ? { t: note.t, from: note.pitch + bend, to: note.pitch } : null;
  return { pieces, lines, slide, held };
}
// a region's pitch range: its notes' lowest to highest, what they slide in from and glide to among them; none without pitches
export function pitchRange(notes: readonly RecordedNote[]): [low: number, high: number] | null {
  const pitches = notes.flatMap((note) => pitchesOf(note));
  if (!pitches.length) {
    return null;
  }
  return [Math.min(...pitches), Math.max(...pitches)];
}
function pitchesOf({ pitch, controllers, lanes }: RecordedNote): number[] {
  if (pitch === undefined) {
    return [];
  }
  return [pitch, pitch + (controllers?.bend ?? 0), ...(lanes?.pitch ?? []).map(({ value }) => value)];
}

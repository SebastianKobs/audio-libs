// ---------- phrasing/speed: how fast a pattern plays as the hand moves, and the feel it calls for ----------
import { lengthOf } from '../sequencer/index.ts';
import { type NotePattern } from '../midi-sequencer/index.ts';
import type { Meter } from '../clock/index.ts';
import { COMMON_TIME, PPQ } from '../clock/index.ts';
interface FeelEdges {
  half: number;
  double: number;
}

// a rhythm's speed for how fast you play (rate: moves a beat, of whatever plays it): the one of half, normal and double time whose
// notes a beat come closest to it, as a ratio (speedAt())
export function speedFor(
  pat: NotePattern,
  rate: number,
  current: number,
  hold: number,
  meter: Meter = COMMON_TIME,
): number {
  return speedAt(notesPerBeat(pat, meter), rate, current, hold);
}
export function notesPerBeat(pat: NotePattern, meter: Meter = COMMON_TIME): number {
  return (pat.events.length * PPQ) / lengthOf(pat, meter);
}
// the speed of half, normal and double time that brings perBeat notes a beat closest to a rate, as a ratio: a rhythm's own density, or one
// the same for every rhythm, as a soloist's line takes it. Another than the current one only once it's closer by more than a
// ratio of hold, so it doesn't flicker between two; not moving, as it was
export function speedAt(perBeat: number, rate: number, current: number, hold: number): number {
  if (!(rate > 0)) {
    return current;
  }
  const off = (speed: number) => Math.abs(Math.log((perBeat * speed) / rate));
  const best = [0.5, 1, 2].reduce((closest, speed) => (off(speed) < off(closest) ? speed : closest));
  return off(current) - off(best) > Math.log(hold) ? best : current;
}
// a line's feel for how fast it's played (speed): half time below one speed, double above another, normal between (at: { half,
// double }). Leaving the feel it has takes crossing its edge by a band, a ratio of hold all told, half of it either side, so it doesn't
// flicker; from double or half straight to the other, if the speed is past that edge too
export function feelFor(speed: number, current: number, edges: FeelEdges, hold: number): number {
  const band = Math.sqrt(hold); // either side of an edge
  const feelAtSpeed = feelPast(speed, edges, band);
  if (current === 2) {
    if (speed < edges.double / band) {
      return feelAtSpeed;
    }
    return 2;
  }
  if (current === 0.5) {
    if (speed > edges.half * band) {
      return feelAtSpeed;
    }
    return 0.5;
  }
  return feelAtSpeed;
}
// the feel a speed calls for once it's past an edge by the band: double, half, or normal
function feelPast(speed: number, edges: FeelEdges, band: number): number {
  if (speed > edges.double * band) {
    return 2;
  }
  if (speed < edges.half / band) {
    return 0.5;
  }
  return 1;
}

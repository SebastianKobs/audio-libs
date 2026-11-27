// ---------- music/meter: the score's time in beats, a beat a quarter note, apart from the clock's seconds ----------
// Its parts:
//   - meter.ts: a meter from its grouping, a bar's length, its groups' starts, its pulses and their weights;
//   - grid.ts: a bar's grid, each beat cut in its subdivisions, mixed in a bar as written;
//   - swing.ts: swing as a ratio, a position swung and back, and the clock's swing;
//   - timing.ts: a timing template, an offset for each index of a beat, in beats or in ms;
//   - layer.ts: a layer across the bar line, its positions over a span and where it resolves;
//   - tempo.ts: beats and milliseconds at a tempo.
export { meterOf, barBeats, groupStarts, pulses, type Meter, type Pulse } from './meter.ts';
export { gridPositions, type GridPosition } from './grid.ts';
export { swungPosition, straightPosition, clockSwingOf, swingRatioOf, type Swing } from './swing.ts';
export { timingOffset, timedPosition, type TimingTemplate } from './timing.ts';
export { layerPositions, resolvesAt, type Layer } from './layer.ts';
export { beatsToMs, msToBeats } from './tempo.ts';

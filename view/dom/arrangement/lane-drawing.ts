// ---------- view/dom/arrangement/lane-drawing: a lane's line drawn on its row, its value on its parameter's whole range (G5b) ----------
import { positionOf } from '../../../params/index.ts';
import { laneLine, type Arrangement, type PlacedLane } from '../../models/index.ts';
import { STEP_PX, xOf } from './pixels.ts';
// a lane as drawn, what the browser tests read: its row, where its line's top and bottom are, px, its value's top and bottom, and its
// line's corners, px
export interface DrawnLane {
  row: string;
  top: number;
  bottom: number;
  corners: { x: number; y: number }[];
}
// where a lane's line goes on its row: from how far down, and how much room it has, px
export interface LaneArea {
  top: number;
  height: number;
}

const SAMPLE_PX = 2; // px: how far apart a glide's curve is sampled

// A lane's line in view, up to now, its value on its parameter's whole range, by its declared
// taper: its top at the top of its area, its bottom at the bottom.
export function drawLane(
  context: CanvasRenderingContext2D,
  lane: PlacedLane,
  area: LaneArea,
  { left, right, map, now }: { left: number; right: number; map: Arrangement['map']; now: number },
  color: string,
): DrawnLane {
  const from = map.timeOf(left);
  const step = map.timeOf(left + SAMPLE_PX / STEP_PX) - from;
  const span = { from, to: Math.min(now, map.timeOf(right)), step };
  const bottom = area.top + area.height;
  const corners = laneLine(lane.points, span).map(({ t, value }) => ({
    x: xOf(map.placeOf(t), left),
    y: bottom - positionOf(lane.spec, value) * area.height,
  }));
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  for (const { x, y } of corners) {
    context.lineTo(x, y);
  }
  context.stroke();
  return { row: lane.row, top: area.top, bottom, corners };
}

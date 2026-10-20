// ---------- view/tracks/models/arrangement/lane-names: what a lane is known by: its row's key, its name, its strip ----------
import type { RecordedLane } from '../../readout/index.ts';
import { SEND } from '../../../../plan/desk/index.ts';
import { addressOf } from '../../../../util/index.ts';

// A lane row's key: the track's key and the controller.
export function laneKeyOf(track: string, controller: string): string {
  return `${track}: ${controller}`;
}
// A lane's name, by its controller: its slot and param, as Ableton names an automation
// lane by its device and param; a send by its return's name; a strip's own by its param.
export function laneName(controller: string): string {
  const [first = '', param] = addressOf(controller); // under its strip: the strip's no part of its name
  if (param === undefined) {
    return first; // a strip's own
  }
  if (first === SEND) {
    return param;
  }
  return `${first} ${param}`;
}
// The strip a lane is on: the one its play was sent to; a strip's own lane, its kind.
export function stripOf(lane: RecordedLane): string {
  return lane.trackName ?? lane.kind;
}

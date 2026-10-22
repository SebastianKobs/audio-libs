// ---------- view/tracks/models/arrangement/lane-names: what a lane is known by: its row's key, its name, its strip ----------
import type { RecordedLane } from '../../readout/index.ts';
import { SEND } from '../../../../plan/desk/index.ts';
import { addressOf } from '../../../../../base/util/index.ts';

// A lane row's key: the track's key and the controller.
export function laneKeyOf(track: string, controller: string): string {
  return `${track}: ${controller}`;
}
// A lane's name, by its controller: its slot and param, as Ableton names an automation
// lane by its device and param; a send by its return's name; a strip's own by its param.
// A param deeper in its slot by its own name: a patch's setting (osc 1/osc/wave) its osc 1's wave.
export function laneName(controller: string): string {
  const [first = '', ...rest] = addressOf(controller); // under its strip: the strip's no part of its name
  const param = rest.at(-1);
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

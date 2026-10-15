// ---------- libs/params: a param as a plugin describes its own, and where its value lies on a control (U2c4a2) ----------
// Its parts:
//   - a param's name, unit, range, choices, default, whether a gain in dB, and its taper; a choice
//     by its index, as a controller carries it (spec.ts);
//   - a position on a knob, a lane or a CC turned into its value and back, the fader law among the tapers (taper.ts);
//   - a gain in dB and back, the floor of silence (decibels.ts);
//   - the specs modules share: a fader's gain, a pan, a switch (common.ts);
//   - a time with a sync switch, its three params and the note values it steps through (time.ts).
// The synth's blocks, the FX modules and a desk's strips declare theirs on it.
export {
  choiceAt,
  choiceIndex,
  isParamSpec,
  specAt,
  type ParamSpec,
  type ParamSpecs,
  type RangedSpec,
  type Taper,
} from './spec.ts';
export { faderGain, faderPosition, positionOf, valueAt } from './taper.ts';
export { dBOf, gainOf, SILENCE } from './decibels.ts';
export { FADER_GAIN, isSwitch, PAN, SWITCH } from './common.ts';
export { NOTE_VALUES, timeSpecs, type FreeUnit, type Time, type TimeSpecs } from './time.ts';

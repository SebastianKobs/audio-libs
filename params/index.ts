// ---------- libs/params: a param as a plugin describes its own, and where its value lies on a control (U2c4a2) ----------
// Its parts:
//   - a param's name, unit, range, choices, default, whether a gain in dB, and its taper (spec.ts);
//   - a position on a knob, a lane or a CC turned into its value and back, the fader law among the tapers (taper.ts);
//   - a gain in dB and back, the floor of silence (decibels.ts);
//   - the specs modules share: a fader's gain, a pan, a switch (common.ts).
// The synth's blocks, the FX modules and a desk's strips declare theirs on it.
export { specAt, type ParamSpec, type ParamSpecs, type RangedSpec, type Taper } from './spec.ts';
export { faderGain, faderPosition, positionOf, valueAt } from './taper.ts';
export { dBOf, gainOf, SILENCE } from './decibels.ts';
export { FADER_GAIN, PAN, SWITCH } from './common.ts';

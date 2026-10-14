// ---------- libs/params: a param as a plugin describes its own, and where its value lies on a control (U2c4a2) ----------
// Its name, unit, range, choices, default, whether a gain in dB, and its taper (spec.ts); a position on a knob, a lane or a CC turned into
// its value and back, the fader law among the tapers (taper.ts). Imports nothing: the synth's blocks, the FX modules and a desk's strips
// declare theirs on it
export { specAt, type ParamSpec, type ParamSpecs, type Taper } from './spec.ts';
export { faderGain, faderPosition, positionOf, valueAt } from './taper.ts';

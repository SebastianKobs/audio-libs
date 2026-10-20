// ---------- libs/view/mixer/readout: a desk as the mixer reads it ----------
// A readout, read by the mixer's models when they want; what's done goes out on the app's bus.
// Its parts:
//   - desk.ts: a desk's readout, as it plays (deskReadout()); what's done on it as its message
//     (deskEdited());
export { deskEdited, deskReadout } from './desk.ts';

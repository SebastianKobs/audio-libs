// ---------- libs/modular-audio/view/desk/readout: a desk as its view reads it ----------
// A readout, read by the desk's view models when they want; what's done goes out on a bus.
// Its parts:
//   - desk.ts: a desk's readout, as it plays (deskReadout()); what's done on it as its message
//     (deskEdited());
export { deskEdited, deskReadout } from './desk.ts';

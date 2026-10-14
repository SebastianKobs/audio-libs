// ---------- libs/desk-plan: a desk as data, Web-Audio-free (U2c4a3) ----------
// As libs/synth/ plans a patch and libs/mixer/ routes: a desk's strips as data, their insert slots each a device with its start, their
// sends and their ways out, and the routing made from them (strip-data.ts); a strip's own parameters declared (params.ts).
// libs/web-audio-mixer/ builds a desk from it
export { nameOf, returnOf, routingOf, slotStart } from './strip-data.ts';
export type { DeskEntry, Names, SendEntry, SlotEntry, StripEntry } from './strip-data.ts';
export { SEND_PARAM, STRIP_PARAMS } from './params.ts';

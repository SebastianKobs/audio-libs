// ---------- libs/desk-plan: a desk as data, Web-Audio-free (U2c4a3) ----------
// As libs/synth/ plans a patch and libs/mixer/ routes: a desk's strips as data, their insert slots each a device with its start, their
// sends and their ways out, and the routing made from them (strip-data.ts); a strip's own parameters declared (params.ts); a parameter's
// key, where on a desk it is, and its spec (keys.ts), found in a desk's data (declared.ts); changes to params held until their
// time (changes.ts).
// libs/web-audio-mixer/ builds a desk from it
export { entryIn, nameOf, returnOf, routingOf, slotStart } from './strip-data.ts';
export type { DeskData, DeskEntry, Names, SendEntry, SlotEntry, StripEntry } from './strip-data.ts';
export { SEND_PARAM, STRIP_PARAMS } from './params.ts';
export { SEND, controllerOf, deviceAt, keyOf, keyOn, keyText, specOf, type ParamKey } from './keys.ts';
export { declaredIn } from './declared.ts';
export { HeldChanges } from './changes.ts';
export type { Change, Ticking } from './changes.ts';

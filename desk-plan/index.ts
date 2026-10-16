// ---------- libs/desk-plan: a desk as data, Web-Audio-free (U2c4a3) ----------
// As libs/synth/ plans a patch and libs/mixer/ routes: a desk's strips as data, their insert slots each a device with its start, their
// sends and their ways out, and the routing made from them (strip-data.ts); a strip's own parameters declared (params.ts); a parameter's
// key, where on a desk it is, and its spec (keys.ts), found in a desk's data (declared.ts); a change to a param by its key
// (changes.ts), held until its time by libs/build/web-audio/.
// libs/web-audio-mixer/ builds a desk from it
export { entryIn, entryNamed, nameOf, returnOf, returnsIn, routingOf, slotStart } from './strip-data.ts';
export type { DeskData, DeskEntry, Names, SendEntry, SlotEntry, StripEntry, StripMix } from './strip-data.ts';
export { SEND_PARAM, STRIP_PARAMS } from '../params/index.ts';
export { SEND, controllerOf, deviceAt, keyOf, keyOn, keyText, specOf, type ParamKey } from './keys.ts';
export { declaredIn } from './declared.ts';
export type { Change } from './changes.ts';

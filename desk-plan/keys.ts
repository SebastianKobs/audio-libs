// ---------- libs/desk-plan/keys: a parameter's key, where on a desk a parameter is ----------
// Declared and readable, not a random id, so what's recorded by it stays readable and the same run to run; the name a view shows is the
// view's. A key's shapes:
//   a strip's own: its strip and the param (volume, pan, mute, solo), `my tap 1/volume`;
//   a send: its strip, the slot SEND and the return's name, `you/send/reverb`;
//   a slot's: its strip, the insert slot and the param of the device on it, `tap/utility/level`.
// Strip, slot and param names hold no slash.
// A controller sent to a strip's track names the key without its strip, the track's:
// `volume`, `send/reverb`, `utility/level`.
import type { ParamSpec, ParamSpecs } from '../params/index.ts';
import { SEND_PARAM, STRIP_PARAMS } from './params.ts';

// a parameter's key: its strip, its slot where it's a send's or a device's, and its param
export interface ParamKey {
  strip: string;
  slot?: string;
  param: string;
}

// the slot a send is keyed by, its param the return's name
export const SEND = 'send';

// A key as text: its parts joined by slashes.
export function keyText({ strip, slot, param }: ParamKey): string {
  if (slot === undefined) {
    return `${strip}/${param}`;
  }
  return `${strip}/${slot}/${param}`;
}
// A key from its text.
export function keyOf(text: string): ParamKey {
  const [strip = '', second = '', third] = text.split('/');
  if (third === undefined) {
    return { strip, param: second };
  }
  return { strip, slot: second, param: third };
}
// A key as a controller on its strip's track: its slot and param, joined by a slash.
export function controllerOf({ slot, param }: ParamKey): string {
  if (slot === undefined) {
    return param;
  }
  return `${slot}/${param}`;
}
// A controller's key, on the strip of the track it's sent to.
export function keyOn(strip: string, controller: string): ParamKey {
  return keyOf(`${strip}/${controller}`);
}
// A key's spec, as declared: a strip's own and a send's the strip's (params.ts); a slot's, its device's, asked of slotSpecs;
// none where nothing declares it.
export function specOf(
  { strip, slot, param }: ParamKey,
  slotSpecs: (strip: string, slot: string) => ParamSpecs | undefined,
): ParamSpec | undefined {
  if (slot === undefined) {
    return (STRIP_PARAMS as Readonly<Record<string, ParamSpec>>)[param];
  }
  if (slot === SEND) {
    return SEND_PARAM;
  }
  const spec = slotSpecs(strip, slot)?.[param];
  if (spec === undefined || !('name' in spec)) {
    return undefined; // a nested part is no param
  }
  return spec as ParamSpec;
}

// ---------- libs/desk-plan/strip-data: a strip as data, and a desk's routing made from it ----------
// The form a desk's own strips and its tracks' templates are written in, which libs/web-audio-mixer/'s build.ts builds.
// Shape: a strip's insert slots, each a device with its start, its sends and its way out.
// A desk's entry is either a return, an FX channel with its chain of effects, or a bus.
// Names: a desk's returns, buses, slots, devices and effects are strings here; a user hands
// in its own literal types for them (Names), so a misspelt one fails the type check there.
import { Routing, type StripKind } from '../mixer/index.ts';

// The names a desk's data is written in, its user's own.
export interface Names {
  return: string;
  bus: string;
  slot: string;
  device: string;
  effect: string;
}
// A device on an insert slot. start: the params it starts at; the others as the device
// starts them, or as the strip's owner sets them as it's built (build.ts's StripValues).
export interface SlotEntry<Named extends Names = Names> {
  slot: Named['slot'];
  device: Named['device'];
  start?: Readonly<Record<string, number>>;
}
// A send: by its return's name, after the fader and the pan; or taken before the fader
// ('pre', after the inserts) or at an insert slot's way in. Its amount the strip's owner's.
export type SendEntry<Named extends Names = Names> =
  Named['return'] | { to: Named['return']; from: 'pre' | Named['slot'] };
// A strip as data: its insert slots in the order the sound goes through them, its sends
// and its way out.
export interface StripEntry<Named extends Names = Names> {
  inserts?: SlotEntry<Named>[];
  sends?: SendEntry<Named>[];
  out?: Named['bus'];
}
// A strip on the desk: a return, an FX channel with its chain of effects, or a bus.
export interface DeskEntry<Named extends Names = Names> extends StripEntry<Named> {
  fx?: Named['return'];
  bus?: Named['bus'];
  chain?: { effect: Named['effect']; params?: Record<string, unknown> }[];
}

// An entry's strip name. An entry is either a return or a bus.
export function nameOf<Named extends Names>(entry: DeskEntry<Named>): Named['return'] | Named['bus'] {
  return (entry.fx ?? entry.bus)!; // one of the two
}
// A slot's start, by the slot's name; none for a strip without that slot.
export function slotStart(entry: StripEntry, slot: string): Readonly<Record<string, number>> | undefined {
  return entry.inserts?.find((inserted) => inserted.slot === slot)?.start;
}
// The return a send goes to.
export function returnOf<Named extends Names>(send: SendEntry<Named>): Named['return'] {
  if (typeof send === 'string') {
    return send;
  }
  return send.to;
}
// A desk's routing from its data: each strip where it goes as it's built, in the desk's
// order, so a way out or a send goes only to what's on it already.
export function routingOf(desk: readonly DeskEntry[]): Routing {
  const routing = new Routing();
  for (const entry of desk) {
    routing.add(nameOf(entry), placeOf(entry));
  }
  return routing;
}
// Where a strip of the desk's goes, from its data: what it is, its way out, and what it
// sends to as it's built. The mixer holds the routing and the strip to agree.
function placeOf(entry: DeskEntry): { kind: StripKind; out: string | undefined; to: string[] } {
  const to = (entry.sends ?? []).map(returnOf);
  if (entry.fx) {
    return { kind: 'return', out: entry.out, to };
  }
  return { kind: 'bus', out: entry.out, to };
}

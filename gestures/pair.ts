// ---------- gestures/pair: two fingers, a pair that pans ----------
import type { Pointer, PointerInput, Tracking } from './shared.ts';

// a second pointer down: with the first, a pair that pans, if it came within "two-finger window" of it, or beside one left from a pan;
// else, and a third, ignored. The pair's events go as the first (pan), from the point between the two, on the screen and on the floor
export function pairUp(tracking: Tracking, { id, x, y, t, g }: PointerInput): void {
  const [first] = tracking.pointers.values() as unknown as [Pointer]; // called with a pointer down
  const again = first.state === 'done';
  const soon = first.state !== 'panning' && first.state !== 'pair' && t - first.pressT! <= tracking.settings.twoFinger;
  if (tracking.pointers.size > 1 || !(again || soon)) {
    return;
  }
  if (!again) {
    first.t = t;
    tracking.emit('takeback', first);
  }
  const second: Pointer = { id, state: 'pair', pan: first.pan ?? first.id, x, y, t, g, mate: first };
  Object.assign(first, { state: 'pair', pan: second.pan, mate: second, t });
  tracking.pointers.set(id, second);
  emitPan(tracking, 'panstart', second);
}
export function emitPan(tracking: Tracking, type: 'panstart' | 'panmove' | 'panend', pointer: Pointer): void {
  return tracking.emit(type, pointer, { id: pointer.pan!, ...between(pointer, pointer.mate!) }); // a pair's: both have a pan and a mate
}
function between(one: Pointer, other: Pointer) {
  return {
    x: (one.x + other.x) / 2,
    y: (one.y + other.y) / 2,
    g: one.g && other.g ? { x: (one.g.x + other.g.x) / 2, z: (one.g.z + other.g.z) / 2 } : null,
  };
}
export function unpair(tracking: Tracking, pointer: Pointer): void {
  // one of a pair lifted: the pan ends, and the other is done until it's lifted
  const mate = pointer.mate!;
  emitPan(tracking, 'panend', pointer);
  Object.assign(mate, { state: 'done', mate: null });
}

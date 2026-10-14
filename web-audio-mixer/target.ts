// ---------- libs/web-audio-mixer/target: a change set on a built strip by its key, on time ----------
// A key (libs/desk-plan/'s ParamKey) lands on a built strip (setOn()):
//   - its own volume or pan, or a send by its return: the strip's own controls (ChannelStrip.set());
//   - a slot's param: the slot's chain, at the port its device declares for the param.
// None for a mute or a solo, which silence a strip by the routing, nor where nothing's built.
// A value lands there by a timing (libs/web-audio-fx/'s), when its change says (timingOf()).
import { SEND, type Change, type ParamKey } from '../desk-plan/index.ts';
import type { Settable, Timing } from '../web-audio-fx/index.ts';
import type { Channel } from './channel.ts';
import type { FxChannel } from './fx-channel.ts';

// a slot's chain and the ports its device declares, by param
interface Slotted {
  chain: Settable;
  ports: Readonly<Record<string, string>>;
}
// the clock a change's time is on, and the audio's clock a time on it is played on
interface Clocks {
  now: number;
  at: (t: number) => number;
}

// A change set on a built strip by its key, by a timing; slotted: a slot's chain and its
// device's ports, by the slot's name. Returns whether the strip has it.
export function setOn(
  strip: Channel | FxChannel,
  { slot, param }: ParamKey,
  value: number,
  timing: Timing,
  slotted: (slot: string) => Slotted | undefined,
): boolean {
  if (slot === undefined || slot === SEND) {
    return strip.set(param, value, timing); // its own, or a send by its return
  }
  const device = slotted(slot);
  const port = device?.ports[param];
  if (!device || !port) {
    return false;
  }
  device.chain.set(port, value, timing);
  return true;
}
// When a change lands on the audio:
//   1. gliding by its time constant: from its time, where that's to come, else from now;
//   2. at once, at its time on the audio's clock, where that's to come;
//   3. else now.
export function timingOf({ t, glide }: Pick<Change, 't' | 'glide'>, { now, at }: Clocks): Timing {
  const toCome = t > now;
  if (glide !== undefined) {
    return toCome ? { glide, from: at(t) } : { glide };
  }
  if (toCome) {
    return { at: at(t) };
  }
  return 'now';
}

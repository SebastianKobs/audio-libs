// ---------- libs/web-audio-mixer/target: where a parameter's key lands on a built strip, and a value set there ----------
// A key (libs/desk-plan/'s ParamKey) lands on a stage and its port:
//   a strip's volume: its volume stage (a channel's fader, an FX channel's level); its pan: its pan stage;
//   a send: the send's stage, once it's built;
//   a slot's param: the slot's chain, at the port its device declares for the param.
// None for a mute or a solo, which silence a strip by the routing, nor where nothing's built at it yet.
// A value lands there by a timing (libs/web-audio-fx/'s): now, at a time on the audio's clock, or gliding by a time constant.
import { SEND, type ParamKey } from '../desk-plan/index.ts';
import type { Settable, Target } from '../web-audio-fx/index.ts';
import type { Channel } from './channel.ts';
import type { FxChannel } from './fx-channel.ts';

// a slot's chain and the ports its device declares, by param
interface Slotted {
  chain: Settable;
  ports: Readonly<Record<string, string>>;
}

// A key's target on a built strip; slotted: a slot's chain and its device's ports, by the slot's name.
export function targetOf(
  strip: Channel | FxChannel,
  { slot, param }: ParamKey,
  slotted: (slot: string) => Slotted | undefined,
): Target | null {
  if (slot === undefined) {
    return ownTarget(strip, param);
  }
  if (slot === SEND) {
    const stage = strip.sendStages[param];
    return stage ? { stage, port: 'gain.gain' } : null;
  }
  const device = slotted(slot);
  const port = device?.ports[param];
  if (!device || !port) {
    return null;
  }
  return { stage: device.chain, port };
}

// a strip's own param's target: its volume or its pan; none for a mute or a solo
function ownTarget(strip: Channel | FxChannel, param: string): Target | null {
  if (param === 'volume') {
    return { stage: strip.volumeStage, port: 'gain.gain' };
  }
  if (param === 'pan' && strip.panStage) {
    return { stage: strip.panStage, port: 'pan.pan' };
  }
  return null;
}

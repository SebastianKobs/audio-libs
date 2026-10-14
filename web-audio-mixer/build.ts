// ---------- libs/web-audio-mixer/build: a strip built from its data, a desk's own or a track's ----------
// One builder for every strip: a desk's own (libs/desk-plan/'s DeskEntry) and its tracks'.
// How a strip is built:
//   1. Each insert slot, in order: its device out of the registry handed in, a chain of one FX
//      module (device-insert.ts), at its start, or at the params the strip's owner hands over
//      for that slot (a live copy, a rule's).
//   2. The strip on the mixer: an FX channel, a bus or a channel, with those inserts, its
//      sends at the amounts its owner hands over (0 where none), its volume, pan and way out.
// Returns the strip and each slot's chain, to set it through.
import type { Device, FxChain } from '../web-audio-fx/index.ts';
import type { Params } from '../synth/index.ts';
import type { Engine } from '../web-audio-engine/index.ts';
import type { Channel } from './channel.ts';
import type { Insert, Send, StripOptions } from './strip.ts';
import type { FxChannel } from './fx-channel.ts';
import type { Mixer } from './mixer.ts';
import { deviceInsert } from './device-insert.ts';
import { returnOf, type StripEntry } from '../desk-plan/index.ts';

// What a strip is built on: the desk's mixer and its engine, a beat's length for a device's
// params in note values, and the devices a slot may hold, by name.
export interface BuildOn {
  mixer: Mixer;
  engine: Engine;
  beat: number;
  devices: Readonly<Record<string, Device>>;
}
// The values a strip is built at, its owner's. None given: the strip's own defaults.
//   params: a slot's params as they play, by slot, over its start.
//   amounts: each send's amount, by its return; 0 where none.
export interface StripValues {
  volume?: number | undefined;
  pan?: number | undefined;
  params?: Readonly<Partial<Record<string, () => Params>>>;
  amounts?: Readonly<Partial<Record<string, number>>> | undefined;
}
// A strip as built: the strip, and each of its slots' chain.
interface Built<Strip> {
  strip: Strip;
  chains: Partial<Record<string, FxChain>>;
}

// A channel or a bus from its data.
export function buildChannel(
  on: BuildOn,
  name: string,
  entry: StripEntry,
  values: StripValues = {},
  kind: 'channel' | 'bus' = 'channel',
): Built<Channel> {
  const { inserts, chains } = slotsOf(on, entry, values);
  const options: StripOptions = {
    volume: values.volume,
    pan: values.pan,
    inserts,
    sends: sendsOf(entry, values),
    out: entry.out,
  };
  if (kind === 'bus') {
    return { strip: on.mixer.bus(name, options), chains };
  }
  return { strip: on.mixer.channel(name, options), chains };
}
// An FX channel from its data: its inserts after its chain, its sends by name after its pan.
export function buildFxChannel(
  on: BuildOn,
  name: string,
  entry: StripEntry,
  values: StripValues = {},
): Built<FxChannel> {
  const { inserts, chains } = slotsOf(on, entry, values);
  const options = { volume: values.volume, inserts, pan: values.pan, sends: sendsOf(entry, values), out: entry.out };
  return { strip: on.mixer.fx(name, options), chains };
}

// Each slot's device, built in order: an insert for the strip, and its chain. Needs no mixer,
// so a master's slots are built before it.
export function slotsOf(
  on: Pick<BuildOn, 'engine' | 'beat' | 'devices'>,
  entry: StripEntry,
  { params }: StripValues,
): { inserts: Insert[]; chains: Partial<Record<string, FxChain>> } {
  const chains: Partial<Record<string, FxChain>> = {};
  const inserts = (entry.inserts ?? []).map(({ slot, device, start }) => {
    const owned = params?.[slot];
    const built = deviceInsert(on.engine, {
      name: slot,
      patch: on.devices[device]!.patch, // a device the registry has
      params: () => ({ ...start, ...owned?.() }),
      beat: on.beat,
    });
    chains[slot] = built.chain;
    return built.insert;
  });
  return { inserts, chains };
}
// Each send at its amount: by name after the fader and the pan, or from where it's taken.
function sendsOf(entry: StripEntry, { amounts }: StripValues): Send[] {
  return (entry.sends ?? []).map((send) => {
    const to = returnOf(send);
    const amount = amounts?.[to] ?? 0;
    if (typeof send === 'string') {
      return { to, amount };
    }
    return { to, amount, from: send.from };
  });
}

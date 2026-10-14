// ---------- libs/desk-plan/declared: a param's declaration found in a desk's data, by its key ----------
// A strip's own and a send: the strip's (params.ts). A slot's, by where it is:
//   1. an FX channel's chain's module: the params its effect declares of its own;
//   2. a desk strip's, the master's or a track's template's slot: the device the data puts
//      there, its params as a registry declares them.
// None where nothing declares it.
import type { ParamSpec, ParamSpecs } from '../params/index.ts';
import { specOf, type ParamKey } from './keys.ts';
import { entryIn, type DeskData, type Names } from './strip-data.ts';

// A desk's declarations, by key.
//   desk, master: its strips' data and the master's; templateOf(): a track's strip's template;
//   devices: each device, its params declared, by the device's name;
//   effects(): the params an effect declares of its own, an FX channel's chain's module's.
export function declaredIn<Named extends Names>({
  devices,
  effects,
  ...data
}: DeskData<Named> & {
  devices: Readonly<Record<string, { readonly params: ParamSpecs }>>;
  effects: (effect: Named['effect']) => ParamSpecs | undefined;
}): (key: ParamKey) => ParamSpec | undefined {
  const slotSpecs = (strip: string, slot: string): ParamSpecs | undefined => {
    const entry = entryIn(data, strip);
    const link = entry && 'chain' in entry ? entry.chain?.find((module) => module.effect === slot) : undefined;
    if (link) {
      return effects(link.effect);
    }
    const device = entry?.inserts?.find((slotEntry) => slotEntry.slot === slot)?.device;
    if (device === undefined) {
      return undefined;
    }
    return devices[device]?.params;
  };
  return (key) => specOf(key, slotSpecs);
}

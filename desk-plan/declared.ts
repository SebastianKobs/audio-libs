// ---------- libs/desk-plan/declared: a param's declaration found in a desk's data, by its key ----------
// A strip's own and a send: the strip's (params.ts). A slot's, by where it is:
//   1. an FX channel's chain's module: the params its effect declares of its own;
//   2. a desk strip's, the master's or a track's template's slot: the device the data puts
//      there, its params as a registry declares them.
// None where nothing declares it.
import type { ParamSpec, ParamSpecs } from '../params/index.ts';
import { specOf, type ParamKey } from './keys.ts';
import { nameOf, type DeskEntry, type Names, type StripEntry } from './strip-data.ts';

// the master's name, as a key names its strip
export const MASTER = 'master';

// A desk's declarations, by key.
//   desk, master: its strips' data and the master's; templateOf(): a track's strip's template;
//   devices: each device's params, declared, by the device's name;
//   effects(): the params an effect declares of its own, an FX channel's chain's module's.
export function declaredIn<Named extends Names>({
  desk,
  master = {},
  templateOf = () => undefined,
  devices,
  effects,
}: {
  desk: readonly DeskEntry<Named>[];
  master?: StripEntry<Named>;
  templateOf?: (strip: string) => StripEntry<Named> | null | undefined;
  devices: Readonly<Record<string, ParamSpecs>>;
  effects: (effect: Named['effect']) => ParamSpecs | undefined;
}): (key: ParamKey) => ParamSpec | undefined {
  // a strip's data, by its name: the master's, a desk strip's, or a track's template's
  const entryOf = (strip: string): DeskEntry<Named> | StripEntry<Named> | undefined => {
    if (strip === MASTER) {
      return master;
    }
    return desk.find((entry) => nameOf(entry) === strip) ?? templateOf(strip) ?? undefined;
  };
  const slotSpecs = (strip: string, slot: string): ParamSpecs | undefined => {
    const entry = entryOf(strip);
    const link = entry && 'chain' in entry ? entry.chain?.find((module) => module.effect === slot) : undefined;
    if (link) {
      return effects(link.effect);
    }
    const device = entry?.inserts?.find((slotEntry) => slotEntry.slot === slot)?.device;
    if (device === undefined) {
      return undefined;
    }
    return devices[device];
  };
  return (key) => specOf(key, slotSpecs);
}

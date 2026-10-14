// ---------- libs/web-audio-mixer/live-devices: a desk's slots as live devices, set by key as they play ----------
// Every slot of the desk's strips and its master holds a live device among the device params
// (libs/web-audio-fx/'s DeviceParams), named by its strip and its slot (deviceAt()), but those
// its owner's rules set:
//   - its start: its device's module's params, with the slot's own start over them;
//   - its ports: its device's, by param.
// Every FX channel's chain's module with params of its own is one too, its params' specs its
// effect's (a delay's time in beats).
import type { Device, DeviceParams } from '../web-audio-fx/index.ts';
import type { ParamSpecs } from '../params/index.ts';
import { deviceAt, nameOf, type DeskEntry, type Names, type StripEntry } from '../desk-plan/index.ts';
import { MASTER } from '../mixer/index.ts';

// Adds the desk's live devices to the device params.
//   desk, master: its strips' data and the master's;
//   devices: each device, its module and its ports, by the device's name;
//   ruled(): the slots of a strip its owner's rules set, which aren't live;
//   effects(): the params an effect declares of its own.
export function addLiveDevices<Named extends Names>(
  params: DeviceParams,
  {
    desk,
    master = {},
    devices,
    ruled = () => [],
    effects,
  }: {
    desk: readonly DeskEntry<Named>[];
    master?: StripEntry<Named>;
    devices: Readonly<Record<string, Device>>;
    ruled?: (strip: string) => readonly string[];
    effects: (effect: Named['effect']) => ParamSpecs | undefined;
  },
): void {
  const strips: [string, StripEntry<Named>][] = [
    [MASTER, master],
    ...desk.map((entry): [string, DeskEntry<Named>] => [nameOf(entry), entry]),
  ];
  for (const [strip, entry] of strips) {
    addSlots(params, strip, entry, { devices, ruled: new Set(ruled(strip)) });
  }
  for (const entry of desk.filter((fxEntry) => fxEntry.fx)) {
    addOwnParams(params, entry, effects);
  }
}

// A strip's slots as live devices, but those its owner's rules set.
function addSlots<Named extends Names>(
  params: DeviceParams,
  strip: string,
  entry: StripEntry<Named>,
  { devices, ruled }: { devices: Readonly<Record<string, Device>>; ruled: ReadonlySet<string> },
): void {
  for (const { slot, device, start } of (entry.inserts ?? []).filter((slotEntry) => !ruled.has(slotEntry.slot))) {
    const { patch, ports } = devices[device]!; // a device the registry has
    params.add(deviceAt(strip, slot), { start: { ...patch.params, ...start }, ports });
  }
}
// An FX channel's chain's modules with params of their own as live devices, their params'
// specs their effects'.
function addOwnParams<Named extends Names>(
  params: DeviceParams,
  entry: DeskEntry<Named>,
  effects: (effect: Named['effect']) => ParamSpecs | undefined,
): void {
  for (const link of (entry.chain ?? []).filter((own) => own.params)) {
    params.add(deviceAt(entry.fx!, link.effect), { start: link.params!, specs: effects(link.effect) ?? {} }); // an FX channel's
  }
}

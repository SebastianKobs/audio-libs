// ---------- libs/web-audio-fx/device-params: a device's params as they play ----------
// As FxModules has the modules: each device by its name, its params a live copy of its
// start, changed only through set(), handed out as copies.
// A param is set on the chain that plays the device, once it's built:
//   - at the port its module declares for it, gliding there;
//   - where it has none, the chain rebuilt, reading the params as they are now,
//     the old one ringing out.
// A param declared in beats is played as the note length it matches,
// or seconds at the beat where none does.
import { delayTimeOf, type Params } from '../synth/index.ts';
import type { ParamSpec } from '../params/index.ts';

// a chain that plays a device: set at a port, or rebuilt
interface Playing {
  set(port: string, value: number): void;
  rebuild(): void;
}
// A device as it's added:
//   start: its params as it starts, which a reset brings back;
//   ports: the port its module declares for each param, by the param's name;
//     none for one set only as it's built;
//   specs: its params' specs where they change how a value plays (a param in beats).
interface Declared {
  start: Params;
  ports?: Readonly<Record<string, string>>;
  specs?: Readonly<Partial<Record<string, ParamSpec>>>;
}
// a device as it plays: its declaration, its params now, the chain that plays it once built
interface Device extends Required<Declared> {
  current: Params;
  chain: Playing | null;
}

export class DeviceParams {
  readonly #beat: () => number;
  readonly #devices = new Map<string, Device>();

  // beat: a beat's length now, for a param in beats
  constructor({ beat }: { beat: () => number }) {
    this.#beat = beat;
  }
  add(device: string, { start, ports = {}, specs = {} }: Declared): void {
    this.#devices.set(device, {
      start: structuredClone(start),
      ports,
      specs,
      current: structuredClone(start),
      chain: null,
    });
  }
  has(device: string): boolean {
    return this.#devices.has(device);
  }
  // A device's params as they play, read each time the chain that plays it is built.
  paramsOf(device: string): () => Params {
    return () => ({ ...this.#devices.get(device)!.current }); // a device added
  }
  // The chain that plays a device, set as its params are.
  playedBy(device: string, chain: Playing): void {
    this.#devices.get(device)!.chain = chain; // a device added
  }
  current(device: string): Params {
    return structuredClone(this.#devices.get(device)!.current); // a device added
  }
  start(device: string): Params {
    return structuredClone(this.#devices.get(device)!.start); // a device added
  }
  set(device: string, param: string, value: number): void {
    const played = this.#devices.get(device)!; // a device added
    played.current[param] = this.#playedAs(played.specs[param], value);
    if (!played.chain) {
      return;
    }
    const port = played.ports[param];
    if (!port) {
      played.chain.rebuild();
      return;
    }
    played.chain.set(port, value);
  }
  // A value as its param plays it: in beats, a note length; any other as it comes.
  #playedAs(spec: ParamSpec | undefined, value: number): number | string {
    if (spec?.unit !== 'beats') {
      return value;
    }
    return delayTimeOf(value, this.#beat());
  }
}

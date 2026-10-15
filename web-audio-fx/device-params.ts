// ---------- libs/web-audio-fx/device-params: a device's params as they play ----------
// As FxModules has the modules: each device by its name, its params a live copy of its
// start, changed only through set(), handed out as copies.
// A param is set on the chain that plays the device, once it's built:
//   - at the port its module declares for it, by a timing, gliding there unless it says;
//   - where it has none, the chain planned again from the params as they are now,
//     followed from now (replans()).
// A param with choices is played as its choice, by its index as a controller carries it.
import type { Params } from '../synth/index.ts';
import { choiceAt, isParamSpec, type ParamSpec, type ParamSpecs } from '../params/index.ts';
import { LiveCopies } from '../util/index.ts';
import type { Follows } from './modules.ts';
import { MOVED, type Settable, type Timing } from './timing.ts';

// a chain that plays a device: set at a port, or following its params
type Playing = Settable & Follows;
// A device as it's added:
//   start: its params as it starts, which a reset brings back;
//   ports: the port its module declares for each param, by the param's name;
//     none for one set only as it's built;
//   specs: its params' specs where they change how a value plays (a param with choices).
interface Declared {
  start: Params;
  ports?: Readonly<Record<string, string>>;
  specs?: ParamSpecs;
}
// a device as it plays: its ports and specs, the chain that plays it once built
interface Device {
  ports: Readonly<Record<string, string>>;
  specs: ParamSpecs;
  chain: Playing | null;
}

export class DeviceParams {
  readonly #params = new LiveCopies<Params>(); // each device's, its start and its live copy
  readonly #devices = new Map<string, Device>();

  add(device: string, { start, ports = {}, specs = {} }: Declared): void {
    this.#params.add(device, start);
    this.#devices.set(device, { ports, specs, chain: null });
  }
  has(device: string): boolean {
    return this.#params.has(device);
  }
  // A device's params as they play, read each time the chain that plays it is built.
  paramsOf(device: string): () => Params {
    return () => ({ ...this.#params.of(device) }); // a device added
  }
  // The chain that plays a device, set as its params are.
  playedBy(device: string, chain: Playing): void {
    this.#devices.get(device)!.chain = chain; // a device added
  }
  // a device's params now, and as it started, as copies; none for a device not added
  current(device: string): Params | undefined {
    return this.#params.current(device);
  }
  start(device: string): Params | undefined {
    return this.#params.start(device);
  }
  // whether a param set plans its device's chain again: one with no port, followed from now
  replans(device: string, param: string): boolean {
    return !this.#devices.get(device)!.ports[param]; // a device added
  }
  set(device: string, param: string, value: number, timing: Timing = MOVED): void {
    const played = this.#devices.get(device)!; // a device added
    this.#params.set(device, { ...this.#params.of(device), [param]: this.#playedAs(played.specs[param], value) });
    if (!played.chain) {
      return;
    }
    const port = played.ports[param];
    if (!port) {
      played.chain.follow();
      return;
    }
    played.chain.set(port, value, timing);
  }
  // A value as its param plays it: with choices, its choice by its index; any other as it comes.
  #playedAs(spec: ParamSpec | ParamSpecs | undefined, value: number): number | string {
    if (!spec || !isParamSpec(spec) || !spec.choices) {
      return value;
    }
    return choiceAt(spec, value);
  }
}

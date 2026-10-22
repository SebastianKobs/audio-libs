// ---------- view/device/models/device-panel: the device view, what's open in it. Pure ----------
// As Ableton's detail view: below the tracks, a track's own devices left to right.
// Opened by what its owner asks, a kind and what of it, as 'strip:' and a strip's address.
// Each kind a chain of devices, handed in, which fills it (its drawer's to use).
// What a device shows is its own models': this holds what's open, and tells it, and what's
// chosen in the composites it shows, kept as it's opened and closed (chosen).
import { Events } from '../../../../base/util/index.ts';
import { Chosen } from './chosen.ts';

// What's open: its title, its kind and what of it, the slot marked, -1 for none.
export interface Opened {
  readonly title: string;
  readonly kind: string;
  readonly which: string;
  readonly mark: number;
}

export class DevicePanel<Chain> {
  readonly chosen = new Chosen(); // each rack's pad, each group's tab
  readonly #chains: Readonly<Record<string, Chain>>;
  readonly #events = new Events<{ change: [] }>();
  #opened: Opened | null = null;

  // chains: what each kind of opening shows, by the kind
  constructor({ chains }: { chains: Readonly<Record<string, Chain>> }) {
    this.#chains = chains;
  }
  // what's open; none while it's closed
  get opened(): Opened | null {
    return this.#opened;
  }
  // the chain of what's open, by its kind; none while it's closed, or for a kind with none
  get chain(): Chain | undefined {
    return this.#opened ? this.#chains[this.#opened.kind] : undefined;
  }
  // the kinds and their chains, in the order handed in
  get chains(): [kind: string, chain: Chain][] {
    return Object.entries(this.#chains);
  }
  // What's opened: what: its kind and what of it, all after the first colon.
  open(title: string, what: string, mark = -1): void {
    const [kind, which = ''] = what.split(/:(.*)/);
    this.#opened = { title, kind: kind!, which, mark }; // split hands back one at least
    this.#events.emit('change');
  }
  close(): void {
    this.#opened = null;
    this.#events.emit('change');
  }
  // told as it's opened, opened over or closed
  onChange(listener: () => void): void {
    this.#events.on('change', listener);
  }
}

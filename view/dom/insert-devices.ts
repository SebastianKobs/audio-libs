// ---------- view/dom/insert-devices: a strip's inserts, each a device as Ableton's are ----------
// Drawn from the strip's model (libs/view/models/), each a composite drawn flat, as the device
// view shows them, a chain of its own (DeviceChain, device-panel-view.ts), opened by a strip's address:
//   - each insert whose slot its owner says something of: a Utility, a Filter, the limiter;
//   - its status: its label and what it does there, and what sets it, where its notes do;
//   - its knobs, each its hint, the template's, and how it's set;
//   - a reset for what's live on it;
//   - a view of its own where its kind has one, the limiter's history (registered by its owner).
import { addressOf, addressText } from '../../plan/format/index.ts';
import { Knob, type Control, type Device, type ViewBuilder } from '../models/index.ts';
import type { CompositeView } from './composite-view.ts';
import type { DeviceChain } from './device-panel-view.ts';

// a strip's inserts, the master's too, each a device in the device view, in the order its
// sound goes through them (fill())
export class InsertDevices implements DeviceChain {
  readonly #models: ViewBuilder;

  constructor({ models }: { models: ViewBuilder }) {
    this.#models = models;
  }
  // a strip's inserts drawn in a row, by its key, each a composite drawn flat, in the order its
  // sound goes through them
  fill(container: HTMLElement, strip: string, composites: CompositeView): void {
    const inserts = this.#models.strip(addressOf(strip))?.inserts ?? [];
    for (const device of inserts.filter(({ slot }) => slot !== undefined)) {
      const composite = { key: addressText(device.address), models: this.#models, address: device.address };
      composites.append(container, composite, {
        status: statusOf(device),
        ...(device.controls.some(isLive) && {
          reset: { label: `reset this ${device.label}`, run: () => reset(device) },
        }),
      });
    }
  }
}

// its status line: its label and what it does there, and what sets it, where its notes do
function statusOf({ label, slot, controls }: Device): string {
  const sources = [...new Set(controls.flatMap(({ role }) => (role.source ? [role.source] : [])))];
  const job = slot?.job ?? '';
  if (!sources.length) {
    return `${label}: ${job}`;
  }
  return `${label}: ${job}, by ${sources.join(' and ')}`;
}
// what's live on a device back as it was when the page loaded
function reset(device: Device): void {
  for (const control of device.controls.filter(isLive)) {
    control.reset();
  }
}
// whether a control is a knob set live here
function isLive(control: Control): control is Knob {
  return control instanceof Knob && control.live;
}

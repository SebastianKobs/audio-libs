// ---------- view/models/arrangement/declared: what the desk declares, as the arrangement asks it ----------
// Read from the desk's view models, by a strip's name:
//   - a lane's param, its range and taper, by its controller there;
//   - the strip's controllers in the order the sound goes through it, as its strip has them:
//     its inserts' controls, its sends, its volume, pan, mute and solo.
import type { Declared } from './ports.ts';
import type { Strip } from '../strip.ts';
import type { ViewBuilder } from '../view-builder.ts';
import { controlAddress } from '../../../plan/desk/index.ts';
import { addressOf, addressText } from '../../../plan/format/index.ts';

export function declaredBy(views: ViewBuilder): Declared {
  return {
    specOf: (strip, controller) => views.control(controlAddress(strip, controller))?.spec,
    controllersOf: (strip) => controllersOf(views.strip(addressOf(strip))),
  };
}

// A strip's controllers in signal order, each by its address under the strip; none for no strip.
function controllersOf(strip: Strip | undefined): string[] {
  if (!strip) {
    return [];
  }
  const controls = [
    ...strip.inserts.flatMap((device) => device.controls),
    ...strip.sends,
    strip.volume,
    strip.pan,
    strip.mute,
    strip.solo,
  ];
  return controls.flatMap((control) => (control ? [addressText(control.address.slice(strip.address.length))] : []));
}

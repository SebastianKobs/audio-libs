// ---------- view/device/models/shaper: a shaper's curve, as a view draws it ----------
// As envelopeDrawing() draws an envelope's: from its device's knobs as they're set, the curve the builder bends the sound
// through (dsp/saturation/), sampled across its input, -1 to 1, a level each step.
// For a view of its own, registered by the shaper's kind (curveDrawings()).
import { shaperCurve } from '../../../../dsp/saturation/index.ts';
import type { Device } from './device.ts';
import { Knob } from './knob.ts';

// a shaper's curve as it's drawn: its output a step across its input, from -1
export interface ShaperDrawing {
  readonly levels: readonly number[];
}

// A shaper's curve from its device's knobs: how finely it's drawn.
export function shaperDrawing(device: Device, { steps }: { steps: number }): ShaperDrawing {
  // a knob's value, by its name; the one given where it has none
  const knob = (name: string, otherwise: number): number => {
    const control = device.controls.find((each) => each.name === name);
    return control instanceof Knob ? control.value : otherwise;
  };
  return { levels: Array.from(shaperCurve(knob('drive', 1), knob('shape', 0), steps)) };
}

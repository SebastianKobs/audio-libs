// ---------- view/device/models/saturation: a saturation's curve, as a view draws it ----------
// From its device's knobs and its style as they're set, what the sound comes out at across its input, -1 to 1: its curve
// driven, its level taken back (libs/dsp/saturation/), colors aside.
// For a view of its own, registered by the saturation's kind (CustomViews).
import { autoGain, curveGain, DRIVE_STYLES, styleBent, type DriveStyle } from '../../../../dsp/saturation/index.ts';
import { Choice } from './choice.ts';
import type { Device } from './device.ts';
import { Knob } from './knob.ts';

// a saturation's curve as it's drawn: its output a step across its input, from -1
export interface SaturationDrawing {
  readonly levels: readonly number[];
}

// A saturation's curve from its device's knobs: how finely it's drawn.
export function saturationDrawing(device: Device, { steps }: { steps: number }): SaturationDrawing {
  const control = (name: string) => device.controls.find((each) => each.name === name);
  // a knob's value, by its name; the one given where it has none
  const knob = (name: string, otherwise: number): number => {
    const found = control(name);
    return found instanceof Knob ? found.value : otherwise;
  };
  const chosen = control('style');
  const style = (chosen instanceof Choice && DRIVE_STYLES.find((each) => each === chosen.value)) || 'smooth';
  return { levels: curveLevels(style, knob('drive', 1), knob('punish', 0), knob('auto', 1), steps) };
}

// the output a step across the input, from -1 to 1: the curve driven, its level taken back
function curveLevels(style: DriveStyle, drive: number, punish: number, auto: number, steps: number): number[] {
  const gain = curveGain(style, drive, punish);
  const level = autoGain(style, gain) ** auto;
  return Array.from({ length: steps }, (_, i) => level * styleBent(style, gain * ((2 * i) / (steps - 1) - 1)));
}

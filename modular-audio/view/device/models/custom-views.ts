// ---------- view/device/models/custom-views: a view of its own, where a view is more than its params ----------
// Registered by a node's kind, a block's (gain) or a composite's (Limiter): a meter, the
// limiter's reduction, an envelope's curve. The rest built from their params.
// The view itself the views': these hold whatever a view library registers.
// What the models draw themselves, the curve blocks' drawings, they register in curveDrawings().
import type { Device } from './device.ts';
import { saturationDrawing } from './saturation.ts';
import { shaperDrawing } from './shaper.ts';

// a curve block's drawing: its output a step across its input, from -1, drawn from its device's knobs
export type CurveDrawing = (device: Device, options: { steps: number }) => { readonly levels: readonly number[] };

// Views of their own, by kind.
export class CustomViews<View> {
  readonly #views = new Map<string, View>();

  // a view for a kind, once
  register(kind: string, view: View): void {
    if (this.#views.has(kind)) {
      throw new Error(`${kind}: a view's registered already`);
    }
    this.#views.set(kind, view);
  }
  // the view of a node's kind; none for one built from its params
  of({ kind }: { readonly kind: string }): View | undefined {
    return this.#views.get(kind);
  }
}

// The curve blocks' drawings by their kinds, in a registry of its own each call: a shaper's and a saturation's.
export function curveDrawings(): CustomViews<CurveDrawing> {
  const drawings = new CustomViews<CurveDrawing>();
  drawings.register('shaper', shaperDrawing);
  drawings.register('saturation', saturationDrawing);
  return drawings;
}

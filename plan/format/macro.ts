// ---------- plan/format/macro: a composite's own param, mapped onto its children's ----------
// As a rack's macro: one knob moving several params inside, each its own way.
// Each target mapped as the synth maps a term: times its factor, held in its range,
// plus its offset. That covers an Ableton macro's min and max.
import type { Address } from './address.ts';
import type { Param } from './param.ts';

// one of a macro's targets: a child's param by its address within the composite, and how the
// macro's value maps onto it
export interface MacroTarget {
  readonly to: Address;
  readonly factor: number;
  readonly offset: number;
  readonly low?: number;
  readonly high?: number;
}
// a macro: a param of the composite's own, and its targets
export interface Macro extends Param {
  readonly maps: readonly MacroTarget[];
}

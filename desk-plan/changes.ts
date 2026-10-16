// ---------- libs/desk-plan/changes: a change to a desk's param by its key ----------
// Held until its time by libs/build/web-audio/'s HeldChanges.
// Until LAY11c takes this library out.
import type { ParamKey } from './keys.ts';
import type { TimedValue } from '../automation/index.ts';

// a change to a param: its key, its value, when it lands, and the time constant it glides there by, where it has one
export interface Change extends TimedValue {
  key: ParamKey;
}

// ---------- plan/desk/messages: a desk's edit, as a message on a bus ----------
// By its address, as a view's knob asks it; played in by whoever owns the desk.
import type { Address } from '../../util/index.ts';

// A desk's edit, by its address: a param's value, or a setting.
export interface DeskMessage {
  readonly type: 'desk edited';
  readonly of: 'values' | 'settings';
  readonly address: Address;
  readonly value: number | string;
}

// ---------- view/device/dom/custom-view: a view of its own, the contract every one meets ----------
// Registered by a device's kind, where a view is more than its params: an envelope's curve,
// the limiter's history.
//   1. html(): drawn before its device's controls, as HTML.
//   2. shown(): once in the page, handed the element its device's controls are drawn in; hands
//      back what redraws it on every frame while it's shown, false once it's gone.
import type { Device } from '../models/index.ts';
import type { Html } from '../../../../base/html/index.ts';

export interface CustomView {
  html(device: Device): Html;
  shown(within: Element, device: Device): () => boolean;
}

// Scenario 3: a plan's device drawn, as a library's user writes it: the voice planned in code
// (plan-in-code.js), read through a preset's readout, its envelope a device, drawn as HTML.
import { planVoice } from './plan-in-code.js';
import { PresetReadout } from '../../modular-audio/view/device/readout/index.ts';
import { ViewBuilder } from '../../modular-audio/view/device/models/index.ts';
import { controlHint, deviceHtml } from '../../modular-audio/view/device/dom/index.ts';

// the voice's envelope as a device, its values the plan's, what's turned kept; drawn
export function drawEnvelope() {
  const plan = planVoice();
  const sent = [];
  const readout = new PresetReadout({ plan: () => plan, values: () => ({}), start: () => ({}) });
  const views = new ViewBuilder(readout, (command) => sent.push(command));
  const device = views.device(['envelope']);
  return { device, sent, html: deviceHtml(device, { status: 'envelope', hintOf: controlHint }).text };
}

// A group of a composite's children drawn (libs/modular-audio/view/device/dom/group-view.ts), as HTML, in node, on the view
// models' voice card of the tests' own (libs/modular-audio/view/device/models/test/card.js): its title, a tab each where it
// has more than one, the chosen one's controls, a view of its own first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupHtml } from '../index.ts';
import { html } from '../../../../../base/html/index.ts';
import { builderOn, CARD } from '../../models/test/card.js';

const LOOK = { hintOf: (control) => `about ${control.name}` };

// the tabs drawn, in order: each child's name, and whether it's marked chosen
function tabsDrawn(text) {
  return [...text.matchAll(/<button( class="chosen")? data-tab="([^"]+)">/g)].map(([, chosen, name]) => [
    name,
    chosen !== undefined,
  ]);
}

test("a group of a composite's children: its title; a tab each, the chosen one marked; the chosen one's controls, a view of its own first; one alone, no tabs", () => {
  const models = builderOn(CARD);
  const [osc, vca] = [models.device(['osc']), models.device(['vca'])];
  const own = (device) => (device.name === 'vca' ? html`<em>own</em>` : undefined);
  const drawn = groupHtml({ title: 'sounds', devices: [osc, vca], chosen: 'vca' }, { ...LOOK, ownOf: own }).text;
  assert.match(drawn, /^<div class="group" data-group="sounds"><div class="group-title">sounds<\/div>/);
  assert.deepEqual(tabsDrawn(drawn), [
    ['osc', false],
    ['vca', true],
  ]);
  assert.match(drawn, /<div class="group-body"><div class="controls" data-own="vca"><em>own<\/em><div class="knob"/);
  assert.match(drawn, /data-knob="vca\/gain"[^>]*title="about gain"/, 'its control, with its hint');
  assert.doesNotMatch(drawn, /data-knob="osc\/frequency"/, 'the others: their tabs only');
  const alone = groupHtml({ title: 'sounds', devices: [osc], chosen: 'nothing' }, LOOK).text;
  assert.deepEqual(tabsDrawn(alone), [], 'one alone: no tabs');
  assert.match(alone, /data-knob="osc\/frequency"/, 'the first, where the chosen is none of them');
});

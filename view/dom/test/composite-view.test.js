// A composite drawn (mockup/src/libs/view/dom/composite-view.ts), an instrument's and a strip's alike, as HTML, in node, on the view
// models' voice card of the tests' own (libs/view/models/test/card.js):
//   - with a face, as its look says: its own device as a group, its children grouped by role in tabs, in the look's order, its matrix;
//   - a rack of them, a pad each, the chosen one's shown;
//   - flat, its controls in a device of its own, as a strip's insert is;
//   - its state: the chosen pad and tabs, a box's reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CompositeView, deviceHtml, groupHtml, html, matrixHtml } from '../index.ts';
import { builderOn, CARD } from '../../models/test/card.js';

const hintOf = (control) => `about ${control.name}`;
const GROUPS = new Map([
  ['source', 'sources'],
  ['stage', 'stages'],
  ['modulator', 'modulators'],
]);
// a rack of two cards, a pluck each, their look an instrument's
function rack() {
  const pads = ['pluck a', 'pluck b'].map((name) => ({
    name,
    composite: { key: name, models: builderOn(CARD), address: [] },
  }));
  return { key: 'tap', pads };
}
const resets = [];
const LOOK = {
  kind: 'instrument',
  status: 'tap: Pluck',
  buttons: html`<button data-play>play</button>`,
  reset: { label: 'reset this instrument', title: 'back', run: () => resets.push('tap') },
  own: 'voice',
  groups: GROUPS,
  matrix: true,
  hintOf,
};

test("a rack: its bar, its status, its buttons and its reset; a pad each, the first shown; its face: its own device as a group, its children's groups by role in the look's order, its matrix", () => {
  const view = new CompositeView();
  const { pads } = rack();
  const models = pads[0].composite.models;
  const group = (title, role) =>
    groupHtml({ title, devices: models.groups([]).find((each) => each.role === role).devices, chosen: '' }, { hintOf })
      .text;
  const face =
    groupHtml({ title: 'voice', devices: [models.device([])], chosen: '' }, { hintOf }).text
    + group('sources', 'source')
    + group('stages', 'stage')
    + group('modulators', 'modulator')
    + `<div class="group" data-group="matrix"><div class="group-title">matrix</div><div class="group-body">${matrixHtml(models.matrix([]), { hintOf }).text}</div></div>`;
  assert.equal(
    view.rackHtml(rack(), LOOK).text,
    '<div class="device instrument" data-rack="tap"><div class="bar"><div class="status" title="tap: Pluck">tap: Pluck</div><div class="buttons"><button data-play>play</button><button class="reset" data-reset="tap" title="back">reset this instrument</button></div></div>'
      + '<div class="group-tabs pads"><button class="chosen" data-pad="pluck a">pluck a</button><button data-pad="pluck b">pluck b</button></div>'
      + `<div class="body"><div class="face" data-card="pluck a">${face}</div></div></div>`,
  );
});

test('the chosen pad and tab kept: drawn again, the pad chosen shown, its group on the tab chosen; a rack of one, no pads', () => {
  const view = new CompositeView();
  view.choosePad('tap', 'pluck b');
  view.chooseTab('pluck b', 'sources', 'osc');
  const drawn = view.rackHtml(rack(), LOOK).text;
  assert.match(drawn, /<button class="chosen" data-pad="pluck b">/);
  assert.match(drawn, /<div class="face" data-card="pluck b">/);
  const alone = view.rackHtml({ key: 'tap', pads: rack().pads.slice(0, 1) }, LOOK).text;
  assert.doesNotMatch(alone, /data-pad/, 'a rack of one: no pads');
});

test("flat, as a strip's insert: its controls in a device of its own, its status and its reset; the reset run by its key", () => {
  const view = new CompositeView();
  const models = builderOn(CARD);
  const vca = { key: 'vca', models, address: ['vca'] };
  const ran = [];
  const look = { status: 'vca: a gain', reset: { label: 'reset this vca', run: () => ran.push('vca') }, hintOf };
  assert.equal(
    view.html(vca, look).text,
    deviceHtml(models.device(['vca']), { status: 'vca: a gain', reset: 'reset this vca', hintOf }).text,
  );
  assert.equal(view.reset('vca'), true);
  assert.equal(view.reset('nothing'), false, 'no reset drawn by that key');
  assert.deepEqual(ran, ['vca']);
});

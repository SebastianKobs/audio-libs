// A composite drawn (modular-audio/view/device/dom/composite-view.ts), an instrument's and a strip's alike, as HTML, in node, on the view
// models' voice card of the tests' own (modular-audio/view/device/models/test/card.js):
//   - with a face, as its look says: its own device as a group, its children grouped by role in tabs, in the look's order, its matrix;
//   - a rack of them, a pad each, the chosen one's shown;
//   - flat, its controls in a device of its own, as a strip's insert is;
//   - the chosen pad and tabs read from their model, handed in; a box's reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CompositeView, controlHint, deviceHtml } from '../index.ts';
import { html } from '../../../../../base/html/index.ts';
import { builderOn, CARD } from '../../models/test/card.js';
import { Chosen } from '../../models/index.ts';

const hintOf = controlHint; // one wording, the composite view's
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
const LOOK = {
  kind: 'instrument',
  status: 'tap: Pluck',
  buttons: html`<button data-play>play</button>`,
  reset: { label: 'reset this instrument', title: 'back', run: () => {} },
  own: 'voice',
  groups: GROUPS,
  matrix: true,
  hintOf,
};

test("a rack: its box marked with its key, its bar with its status, buttons and reset; a pad each, the first chosen; its face: the groups in the look's order, its matrix last", () => {
  const view = new CompositeView({ chosen: new Chosen() });
  const drawn = view.rackHtml(rack(), LOOK).text;
  assert.match(drawn, /^<div class="device instrument" data-rack="tap"><div class="bar">/);
  assert.match(drawn, /<div class="status" title="tap: Pluck">tap: Pluck<\/div>/);
  assert.match(drawn, /<button data-play>play<\/button>/, "its owner's buttons");
  assert.match(drawn, /<button class="reset" data-reset="tap" title="back">reset this instrument<\/button>/);
  assert.deepEqual(
    [...drawn.matchAll(/<button( class="chosen")? data-pad="([^"]+)">/g)].map(([, chosen, name]) => [
      name,
      chosen !== undefined,
    ]),
    [
      ['pluck a', true],
      ['pluck b', false],
    ],
    'a pad each, the first chosen',
  );
  assert.equal(drawn.match(/data-card="/g).length, 1, 'only the chosen pad drawn');
  const [, face] = /<div class="face" data-card="pluck a">(.*)<\/div><\/div><\/div>$/.exec(drawn);
  assert.deepEqual(
    [...face.matchAll(/data-group="([^"]+)"/g)].map(([, title]) => title),
    ['voice', 'sources', 'stages', 'modulators', 'matrix'],
    "its own device first, then the children's groups in the look's order, the matrix last",
  );
  assert.match(
    face,
    /data-group="matrix"><div class="group-title">matrix<\/div><div class="group-body"><div class="matrix">/,
  );
});

test("the chosen pad and tab its model's, handed in: drawn again, the pad chosen shown, its group on the tab chosen; a rack of one, no pads", () => {
  const chosen = new Chosen();
  const view = new CompositeView({ chosen });
  chosen.choosePad('tap', 'pluck b');
  chosen.chooseTab('pluck b', 'sources', 'osc');
  const drawn = view.rackHtml(rack(), LOOK).text;
  assert.match(drawn, /<button class="chosen" data-pad="pluck b">/);
  assert.match(drawn, /<div class="face" data-card="pluck b">/);
  const alone = view.rackHtml({ key: 'tap', pads: rack().pads.slice(0, 1) }, LOOK).text;
  assert.doesNotMatch(alone, /data-pad/, 'a rack of one: no pads');
});

test("flat, as a strip's insert: its controls in a device of its own, its status and its reset; the reset run by its key", () => {
  const view = new CompositeView({ chosen: new Chosen() });
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

test("a view of its own, by its device's kind: drawn before its controls, marked; once in the page, redrawn on every frame until it's gone", () => {
  const view = new CompositeView({ chosen: new Chosen() });
  const shown = [];
  let there = true;
  view.register('gain', {
    html: (device) => html`<em>${device.name}</em>`,
    shown: (element, device) => {
      shown.push([element.dataset.own, device.name]);
      return () => {
        shown.push('redrawn');
        return there;
      };
    },
  });
  const models = builderOn(CARD);
  const into = within({ dataset: { own: 'vca' } });
  view.append(into, { key: 'vca', models, address: ['vca'] }, { status: 'vca' });
  assert.match(into.drawn[0], /<div class="controls" data-own="vca"><em>vca<\/em>/);
  assert.deepEqual(shown, [['vca', 'vca']], 'shown once drawn');
  view.redraw();
  there = false;
  view.redraw();
  view.redraw();
  assert.deepEqual(shown.slice(1), ['redrawn', 'redrawn'], 'gone: no more');
});

// what a composite is drawn into, of the test's own: what's drawn kept as text; its box, the element a view of its own is in
function within(own) {
  const box = { querySelectorAll: (selector) => (selector === '[data-own]' ? [own] : []) };
  return {
    drawn: [],
    insertAdjacentHTML(where, text) {
      this.drawn.push(text);
    },
    lastElementChild: box,
  };
}

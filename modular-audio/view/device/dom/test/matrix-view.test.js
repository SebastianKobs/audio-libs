// A matrix drawn (libs/modular-audio/view/device/dom/matrix-view.ts), as HTML, in node, on the view models' voice card of
// the tests' own (libs/modular-audio/view/device/models/test/card.js): a row a source and what it moves, how much: a macro's
// map as text, a modulator's reach a knob of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrixHtml } from '../index.ts';
import { builderOn, CARD } from '../../models/test/card.js';

test("the matrix: its heads, then a row a source and what it moves; how much, a macro's map as text, a modulator's reach a knob of its own", () => {
  const rows = builderOn(CARD).matrix([]);
  const text = matrixHtml(rows, { hintOf: (control) => `about ${control.name}` }).text;
  assert.match(
    text,
    /^<div class="matrix"><span class="head">source<\/span><span class="head">moves<\/span><span class="head">by<\/span>/,
  );
  const places = rows.map(({ source, target }) => text.indexOf(`<span>${source}</span><span>${target}</span>`));
  assert.ok(
    places.every((place, index) => place > 0 && place > (places[index - 1] ?? 0)),
    'a row each, in order',
  );
  assert.deepEqual(
    [...text.matchAll(/<span class="map">([^<]*)<\/span>/g)].map(([, map]) => map),
    ['×1.3 ≤ 5', '×1'],
    "a macro's map: its factor, its ends",
  );
  const reach = text.indexOf('<div class="knob" data-knob="env/amount"');
  assert.ok(reach > places[2], "a modulator's reach, a knob of its own, in its row");
  assert.match(text, /data-knob="env\/amount"[^>]*title="about amount"/, 'with its hint');
});

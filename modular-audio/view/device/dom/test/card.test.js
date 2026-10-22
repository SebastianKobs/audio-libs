// A voice card drawn (mockup/src/libs/modular-audio/view/device/dom), as HTML, in node, on the view models' voice card of the tests' own
// (libs/modular-audio/view/device/models/test/card.js):
//   - a knob's rings: the range each source moves it through, under its bar, named;
//   - a group of a composite's children: its title, a tab each where it has more than one, the chosen one's controls, a
//     view of its own first;
//   - an envelope's curve: its line and the area under it, its delay's end dotted, the note's end dashed;
//   - the matrix: a row a source and what it moves, how much: a macro's map as text, a modulator's reach a knob of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeHtml, groupHtml, knobHtml, matrixHtml } from '../index.ts';
import { html } from '../../../../../base/html/index.ts';
import { builderOn, CARD } from '../../models/test/card.js';

const LOOK = { hintOf: (control) => `about ${control.name}` };

test("a knob's rings: under its bar, from where each source moves it to where, by its taper, named; none where nothing moves it", () => {
  const models = builderOn(CARD);
  const decay = models.control(['env', 'decay']);
  const [{ from, to }] = decay.rings;
  const ring = `<u class="ring" style="--from:${Math.min(from, to)};--span:${Math.abs(to - from)}" title="moved by decay"></u>`;
  assert.ok(knobHtml('decay', decay).text.includes(`${ring}</i>`), 'inside its bar');
  assert.doesNotMatch(knobHtml('frequency', models.control(['osc', 'frequency'])).text, /ring/);
});

test("a group of a composite's children: its title, a tab each where it has more than one, the chosen one's controls, a view of its own first; one alone, no tabs", () => {
  const models = builderOn(CARD);
  const [osc, vca] = [models.device(['osc']), models.device(['vca'])];
  const own = (device) => (device.name === 'vca' ? html`<em>own</em>` : undefined);
  const drawn = groupHtml({ title: 'sounds', devices: [osc, vca], chosen: 'vca' }, { ...LOOK, ownOf: own }).text;
  assert.equal(
    drawn,
    `<div class="group" data-group="sounds"><div class="group-title">sounds</div><div class="group-tabs"><button data-tab="osc">osc</button><button class="chosen" data-tab="vca">vca</button></div><div class="group-body"><div class="controls" data-own="vca"><em>own</em>${knobHtml('gain', vca.controls[0], { title: 'about gain' }).text}</div></div></div>`,
  );
  const alone = groupHtml({ title: 'sounds', devices: [osc], chosen: 'nothing' }, LOOK).text;
  assert.doesNotMatch(alone, /group-tabs/, 'one alone: no tabs');
  assert.match(alone, /data-knob="osc\/frequency"/, 'the first, where the chosen is none of them');
});

test("an envelope's curve: its line and the area under it, a second 60 px across, 40 high; its delay's end dotted, the note's end dashed; a trigger's no end", () => {
  const drawing = { levels: [0, 1, 0.5, 0], step: 0.5, delay: 0.5, noteOff: 1 };
  assert.equal(
    envelopeHtml(drawing).text,
    '<svg class="envelope-curve" viewBox="0 0 90 40" width="90" height="40" preserveAspectRatio="none"><polygon class="area" points="0,40 0,40 30,0 60,20 90,40 90,40"></polygon><polyline class="line" points="0,40 30,0 60,20 90,40"></polyline><line class="delay" x1="30" y1="0" x2="30" y2="40"></line><line class="off" x1="60" y1="0" x2="60" y2="40"></line></svg>',
  );
  assert.doesNotMatch(
    envelopeHtml({ ...drawing, delay: 0, noteOff: null }).text,
    /class="(delay|off)"/,
    'no delay, no end',
  );
});

test("the matrix: a row a source and what it moves; how much, a macro's map as text, a modulator's reach a knob of its own", () => {
  const rows = builderOn(CARD).matrix([]);
  const amount = rows[2].amount;
  assert.equal(
    matrixHtml(rows, LOOK).text,
    '<div class="matrix"><span class="head">source</span><span class="head">moves</span><span class="head">by</span>'
      + '<span>decay</span><span>env/decay</span><span class="map">×1.3 ≤ 5</span>'
      + '<span>gate</span><span>env/gate</span><span class="map">×1</span>'
      + `<span>env</span><span>vca/gain</span>${knobHtml('amount', amount, { title: 'about amount' }).text}</div>`,
  );
});

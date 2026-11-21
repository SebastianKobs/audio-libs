// An envelope's curve drawn (modular-audio/view/device/dom/envelope-view.ts), as SVG, in node: its line and the area
// under it, a second 60 px across, 40 high; its delay's end dotted, the note's end dashed, a trigger's none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeHtml } from '../index.ts';

// the points of a drawn element, as [x, y] pairs
function pointsOf(text, element) {
  const [, points] = new RegExp(`<${element} [^>]*points="([^"]+)"`).exec(text);
  return points.split(' ').map((pair) => pair.split(',').map(Number));
}
// the x of a drawn vertical mark, its top and its bottom
function markX(text, kind) {
  const found = new RegExp(`<line class="${kind}" x1="([^"]+)" y1="0" x2="([^"]+)" y2="40">`).exec(text);
  return found && [Number(found[1]), Number(found[2])];
}

test("an envelope's curve: its line a point a level, a second 60 px across, the top a level of 1; the area under it; its delay's end dotted, the note's end dashed; a trigger's no end", () => {
  const drawing = { levels: [0, 1, 0.5, 0], step: 0.5, delay: 0.5, noteOff: 1 };
  const text = envelopeHtml(drawing).text;
  const line = pointsOf(text, 'polyline');
  assert.deepEqual(
    line.map(([x]) => x),
    [0, 30, 60, 90],
    'a step half a second: 30 px',
  );
  assert.deepEqual(
    line.map(([, y]) => y),
    [40, 0, 20, 40],
    'a level of 1 at the top, 0 at the bottom',
  );
  assert.deepEqual(
    pointsOf(text, 'polygon'),
    [[0, 40], ...line, [90, 40]],
    'the area: the line, closed along the bottom',
  );
  assert.match(
    text,
    /<svg class="envelope-curve" viewBox="0 0 90 40" width="90" height="40"/,
    'as wide as the curve runs',
  );
  assert.deepEqual(markX(text, 'delay'), [30, 30], "the delay's end, at half a second");
  assert.deepEqual(markX(text, 'off'), [60, 60], "the note's end, at a second");
  const trigger = envelopeHtml({ ...drawing, delay: 0, noteOff: null }).text;
  assert.deepEqual([markX(trigger, 'delay'), markX(trigger, 'off')], [null, null], 'no delay, no end');
});

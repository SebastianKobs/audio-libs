// The arrangement drawn (mockup/src/libs/view/tracks/dom/arrangement/; mockup/src/mixer-surface/arrangement/ until SHAPE4b), its parts that
// need no page: the time in view in pixels, as its drawer lays it out; a canvas sized for the screen's pixels, the arrangement's and the
// limiter's history's (canvas.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_PX, placeAt, xOf } from '../arrangement/pixels.ts';
import { sizedCanvas } from '../../../html/index.ts';

test("a place's x in view, 8 px a 16th from the place at its left edge", () => {
  assert.equal(STEP_PX, 8);
  assert.equal(xOf(100, 52), 48 * STEP_PX, 'the present a bar from the right edge of a view four bars wide');
});

test('the place under an x in the time in view, the other way from xOf (P2)', () => {
  assert.equal(placeAt(xOf(77, 52), 52), 77);
  assert.equal(placeAt(0, 52), 52);
});

// a canvas as the drawers size it: its style, its pixels and its context's transform, kept
function canvasOf(clientWidth = 0) {
  const transforms = [];
  const context = { setTransform: (...matrix) => transforms.push(matrix) };
  return { canvas: { clientWidth, style: {}, width: 0, height: 0, getContext: () => context }, context, transforms };
}

test("a canvas sized for the screen's pixels: as many as the screen has to a CSS pixel, its context drawing in CSS pixels; as wide as it's shown where it's given no width; sized again, the same", () => {
  globalThis.devicePixelRatio = 1.5;
  try {
    const history = canvasOf();
    assert.equal(sizedCanvas(history.canvas, { width: 160, height: 41 }), history.context);
    assert.deepEqual(
      [history.canvas.style, history.canvas.width, history.canvas.height],
      [{ width: '160px', height: '41px' }, 240, 62],
    );
    const ruler = canvasOf(301);
    sizedCanvas(ruler.canvas, { height: 18 });
    sizedCanvas(ruler.canvas, { height: 18 });
    assert.deepEqual([ruler.canvas.style, ruler.canvas.width, ruler.canvas.height], [{ height: '18px' }, 452, 27]);
    assert.deepEqual(ruler.transforms, [
      [1.5, 0, 0, 1.5, 0, 0],
      [1.5, 0, 0, 1.5, 0, 0],
    ]);
  } finally {
    delete globalThis.devicePixelRatio;
  }
});

test('a screen that says nothing of its pixels: one to a CSS pixel', () => {
  const { canvas } = canvasOf(100);
  sizedCanvas(canvas, { height: 10 });
  assert.deepEqual([canvas.width, canvas.height], [100, 10]);
});

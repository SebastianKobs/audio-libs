// base/html/canvas.ts: a canvas sized for the screen's pixels, so it's sharp on any screen,
// its context drawing in CSS pixels
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizedCanvas } from '../index.ts';

test("a canvas sized for the screen's pixels: as many as the screen has to a CSS pixel, its context drawing in CSS pixels; as wide as it's shown where it's given no width; sized again, the same; one to a CSS pixel where the screen says nothing", () => {
  globalThis.devicePixelRatio = 1.5;
  try {
    const withWidth = canvasOf();
    assert.equal(sizedCanvas(withWidth.canvas, { width: 160, height: 41 }), withWidth.context);
    assert.deepEqual(
      [withWidth.canvas.style, withWidth.canvas.width, withWidth.canvas.height],
      [{ width: '160px', height: '41px' }, 240, 62],
    );
    const withoutWidth = canvasOf(301);
    sizedCanvas(withoutWidth.canvas, { height: 18 });
    sizedCanvas(withoutWidth.canvas, { height: 18 });
    assert.deepEqual(
      [withoutWidth.canvas.style, withoutWidth.canvas.width, withoutWidth.canvas.height],
      [{ height: '18px' }, 452, 27],
    );
    assert.deepEqual(withoutWidth.transforms, [
      [1.5, 0, 0, 1.5, 0, 0],
      [1.5, 0, 0, 1.5, 0, 0],
    ]);
  } finally {
    delete globalThis.devicePixelRatio;
  }
  const screenSaysNothing = canvasOf(100);
  sizedCanvas(screenSaysNothing.canvas, { height: 10 });
  assert.deepEqual(
    [screenSaysNothing.canvas.width, screenSaysNothing.canvas.height],
    [100, 10],
    'a screen that says nothing of its pixels',
  );
});

// a canvas as the drawers size it: its style, its pixels and its context's transform, kept
function canvasOf(clientWidth = 0) {
  const transforms = [];
  const context = { setTransform: (...matrix) => transforms.push(matrix) };
  return { canvas: { clientWidth, style: {}, width: 0, height: 0, getContext: () => context }, context, transforms };
}

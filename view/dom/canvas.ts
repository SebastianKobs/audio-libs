// ---------- view/dom/canvas: a canvas sized for the screen's pixels ----------

// A canvas sized for the screen's pixels, and its context:
//   - its size in CSS pixels, as wide as it's shown where it's given no width;
//   - as many pixels as the screen has to a CSS pixel, so it's sharp on any screen;
//   - its context drawing in CSS pixels, set again however often it's sized.
export function sizedCanvas(
  canvas: HTMLCanvasElement,
  { width, height }: { width?: number; height: number },
): CanvasRenderingContext2D {
  const density = globalThis.devicePixelRatio || 1;
  if (width !== undefined) {
    canvas.style.width = `${width}px`;
  }
  canvas.style.height = `${height}px`;
  canvas.width = Math.round((width ?? canvas.clientWidth) * density);
  canvas.height = Math.round(height * density);
  const context = canvas.getContext('2d')!; // a canvas has one
  context.setTransform(density, 0, 0, density, 0, 0);
  return context;
}

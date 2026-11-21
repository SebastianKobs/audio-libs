// ---------- base/html: HTML made safely, and a canvas for the screen ----------
// What every view's drawer uses, no view's own:
//   - elements.ts: an element made, and HTML made by html``, every value escaped;
//   - canvas.ts: a canvas sized for the screen's pixels.
export { appendHtml, Html, html, makeElement, setHtml } from './elements.ts';
export { sizedCanvas } from './canvas.ts';

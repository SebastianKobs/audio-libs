# libs/view/html

HTML made safely, and a canvas for the screen, what every view's drawer uses and none owns.

| Part | Holds |
|---|---|
| `elements.ts` | `makeElement()`, an element made, its class and its text; `html```, HTML made from a template, every value escaped as it's made, a list's items one after another (`Html`); `setHtml()`, the views' one way into the page's HTML, and `appendHtml()`, added after what's there; the session view's until LAY12d1 (`session-view/html.ts`) |
| `canvas.ts` | `sizedCanvas()`: a canvas sized for the screen's pixels, as many as it has to a CSS pixel, its context drawing in CSS pixels, as wide as it's shown where it's given no width; the arrangement's and the limiter's history's (SHAPE4b) |

Tested in node: HTML as text (`test/elements.test.js`).

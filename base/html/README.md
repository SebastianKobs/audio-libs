# base/html

HTML made safely, and a canvas for the screen. A template literal escapes every value put in it, so what goes into the page is made, never pasted.

Depends on: nothing.

```ts
import { html, makeElement, setHtml, sizedCanvas } from './index.ts';

const name = 'a <b>name</b>';
const row = html`<li>${name}</li>`; // row.text: <li>a &#60;b&#62;name&#60;/b&#62;</li>
setHtml(makeElement('ul', 'names'), row); // the one way into the page's HTML
const context = sizedCanvas(makeElement('canvas'), { height: 80 }); // sharp on any screen
```

| Export | What it does |
|---|---|
| `html`, `Html` | HTML from a template: each value escaped, an `Html` or a list of them kept as HTML, its items one after another (`elements.ts`). |
| `setHtml()`, `appendHtml()` | The one way a made `Html` goes into an element, replacing what's there or added after it (`elements.ts`). |
| `makeElement()` | An element made with its class and its text (`elements.ts`). |
| `sizedCanvas()` | A canvas sized for the screen's pixels, its context drawing in CSS pixels, as wide as it's shown where it's given no width (`canvas.ts`). |

Tests: `test/elements.test.js`, HTML as text; `test/canvas.test.js`, a canvas sized for the screen.

# sequencing/view/transport/dom

The transport's lane drawn in the DOM from its model: ▶ lit while the music plays, ■, and where it is, bar and beat. ▶ and ■ are sent as messages, play and stop; what they do is the owner's.

Depends on: `base/html`, `sequencing/view/transport/models`.

```ts
import { TransportLaneView } from './index.ts';
const view = new TransportLaneView({
  lane, // a TransportLane from sequencing/view/transport/models
  within: document.body, // the lane is put at its top
  hints: { play: 'Play', stop: 'Stop', position: 'Bar and beat' },
  send: (message) => console.log(message.type), // 'play' or 'stop'
});
view.draw(); // each frame, as a key may play and stop it too
```

| Export | What it does |
|---|---|
| `new TransportLaneView({ lane, within, hints, send })`: `draw()` | The lane drawn at the top of the element it's handed. `draw()` lights ▶ and writes the position only as it changes (`transport-lane-view.ts`). |
| `TransportHints` | The hints on ▶, ■ and the position, in the owner's words (`transport-lane-view.ts`). |

Tests: none of its own; the end-to-end tests drive the lane (`mockup/test/e2e/baseline.spec.js`).

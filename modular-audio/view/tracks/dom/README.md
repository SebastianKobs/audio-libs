# modular-audio/view/tracks/dom

The session view's, the clips' and the arrangement's view models drawn in the DOM, on the desk's drawing and the device view's: one implementation of the views, as Web Audio is of the sound. The session view's strips are drawn on it too.

Depends on: `base/html`, `base/params`, `modular-audio/view/desk/dom`, `modular-audio/view/desk/models`, `modular-audio/view/device/dom`, `modular-audio/view/device/models`, `modular-audio/view/tracks/models`, `modular-audio/view/tracks/readout`.

```ts
import type { Arrangement, Views } from '../models/index.ts';
import { ArrangementView, ViewStrip, type ArrangementColors } from './index.ts';

declare const arrangement: Arrangement;
declare const views: Views;
declare const colors: () => ArrangementColors; // its owner's, read as it draws
const arrangementView = new ArrangementView({ arrangement, colors });
const strip = new ViewStrip({ views, arrangement: arrangementView }); // the strip along the bottom
views.tab('arrangement', true); // shown; arrangementView.drawFrame() on every frame
```

| Export | What it does |
|---|---|
| `new ClipTracksView({ within, clips, hints, opens, open, folding, folded })`: `section`, `setBeat()`, `draw()`, `expire()` | The clip tracks drawn from their model, a section that folds, a column each, made once so it keeps its scroll: a chip a clip, lit while it sounds, a played track's with ▶ and × (showing "delete?" while it asks). A click anywhere in what it's made in is handed to its model, a clip track's name opening what it opens (`clip-tracks-view.ts`). |
| `ClipHints` | The hints on a clip's ▶ and ×, in its owner's words (`clip-tracks-view.ts`). |
| `new ArrangementView({ arrangement, colors })`: `element`, `show()`, `drawFrame()`, `drawn()`, `playhead` | The arrangement on the page, from its model: its names beside its time, a group's header folding it, a track's ▸ opening its lanes, a drag or a wheel scrolling it, a press in the ruler placing the playhead. It draws on every frame while it shows, on canvases at 8 px a 16th, and keeps what it drew for the browser tests (`arrangement/arrangement-view.ts`). |
| `ArrangementColors`, `ArrangementDrawn` | The colors it draws with, handed in; and what's drawn, as the browser tests read it: the rows, the regions in view with their notes, the opened lanes' lines, whether it follows the present, and the place and x of the left edge, the present and the playhead (`arrangement/arrangement-view.ts`). |
| `new SessionDrawing({ clock, frameStep, views, transport, session, tracks, clipTracks, deskView, devicePanel, devicePanelView, flow, page })`: `draw()`, `drawLive()` | When the session view is drawn: on every beat while it's shown and from a beat back as it's shown, a beat after the last while playing back, held while a pointer is pressed on it so a click lands. `drawLive()` draws the level bars and the device view's knobs on every frame (`session-drawing.ts`). |
| `new ViewStrip({ views, arrangement })`: `strip`, `flow` | The strip along the bottom: the session view's sections in one row as the sound flows, then the arrangement, drawn from which one is open, shown while either is (`view-strip.ts`). |

The arrangement is drawn on canvases in `arrangement/`: the bar ruler and the rows' bands (`arrangement/time-drawing.ts`), each region a block labeled with its clip with its notes inside it at their pitch (`arrangement/note-drawing.ts`), a lane's line on its param's range (`arrangement/lane-drawing.ts`), and the present and the playhead.

Tests: `test/session-drawing.test.js`, when each beat and frame is drawn; `test/arrangement.test.js`, the arrangement's x in view, read from what the view drew on a canvas stand-in in `test/dom-stand-in.js`.

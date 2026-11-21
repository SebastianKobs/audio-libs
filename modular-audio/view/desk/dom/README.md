# modular-audio/view/desk/dom

A desk drawn in the DOM, on a device's drawers: its strips side by side in sections as the sound flows, the tracks, the buses, the FX buses and the master, with their level bars, lights and clicks. A strip's inserts are drawn as devices.

Depends on: `base/html`, `base/util`, `modular-audio/view/desk/models`, `modular-audio/view/device/dom`, `modular-audio/view/device/models`.

```ts
import { Toggles, type DeskViewBuilder } from '../models/index.ts';
import { DeskView } from './index.ts';

declare const models: DeskViewBuilder; // the desk's view models
const view = new DeskView({
  within: document.body,
  models,
  look: { labels: { tracks: 'Tracks', buses: 'Buses', returns: 'FX buses', master: 'Master' }, tracksShown: () => 0 },
  folding: { sections: new Toggles(), groups: new Toggles() }, // what's folded, a model's
  changed: () => view.draw(), // told after a click or a drag changed what it draws
});
view.onOpen((...opened) => console.log(opened)); // a click on a strip's name or slot: its address, title and slot
view.draw(); // the desk's own channels as one group of tracks, where it's handed none
view.drawLevels(1 / 60); // on every frame: each bar falls as a peak meter's
```

Its clicks are its own:

- A strip's name or slot is told to whoever listens, by the strip's address (`onOpen()`).
- M mutes a strip, S solos it alone, and with shift adds it or lets it go.
- A group's header folds it to its first track, with shift every group; which are unfolded is a model's (`Toggles`).
- A knob is dragged, or set back by a double-click.

Lights show on a folded section and on a group's dot while a hidden strip sounds, by what the strips heard feed (`fedBy()`).

| Export | What it does |
|---|---|
| `new DeskView({ within, models, look, folding, changed })`: `draw()`, `drawLevels()`, `light()`, `onOpen()`, `sections` | A desk drawn in its sections. `draw(groups?)` draws the groups of tracks the view hands it, else the desk's own channels as one, in a box kept across drawings, then the buses, returns and master (`desk-view.ts`). |
| `DeskLook` | How a view shows its desk: each section's label, and how many tracks a group's box shows before it scrolls, 0 showing all (`desk-view.ts`). |
| `new SectionView(within, label, { folding, folded })`: `element`, `row`, `light()` | A section of a view, its label and its strips in a row. One that folds has an arrow and a dot, and a click on its label folds it to its first strip, with shift every section beside it (`section-view.ts`). |
| `deskHtml()`, `trackHtml()`, `fedBy()` | The desk's own channels as HTML, a section each (`deskHtml(models, levelOf)`); a track's strip, empty while it plays nothing (`trackHtml()`); and what the strips heard feed, through ways out and sends turned up (`fedBy()`) (`desk-html.ts`). |
| `new InsertDevices({ models })`: `fill()` | A strip's inserts, the master's too, as a chain of the device view's, opened by the strip's address. Each insert is a composite drawn flat in the order its sound goes through them, with a reset for what's live on it (`insert-devices.ts`). |
| `stripHtml()`, `slotsHtml()`, `muteSoloHtml()`, `StripLook` | A strip drawn from its model: its name, where it goes, what plays on it, its slots, sends, pan, fader, level bar, mute and solo, quiet where it's silent. `StripLook` is what it's drawn with beside the strip (`strip-view.ts`). |

Tests: `test/strip-view.test.js` and `test/desk-html.test.js`, on HTML as text and on values, on the models' small desk in `modular-audio/view/desk/models/test/desk.js`.

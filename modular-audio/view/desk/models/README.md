# modular-audio/view/desk/models

A desk's view models, no DOM, on a device's: a channel as a strip, a desk as its strips by role, the groups of tracks it shows, and what a view has folded or opened.

Depends on: `base/util`, `modular-audio/plan/format`, `modular-audio/view/device/models`.

```ts
import type { Command, PlanReadout } from '../../device/readout/index.ts';
import { DeskViewBuilder, Toggles } from './index.ts';

declare const planReadout: PlanReadout; // a desk's, as its readout reads it
declare const send: (command: Command) => void;
const views = new DeskViewBuilder(planReadout, send);
const desk = views.desk(); // its strips by role, in the plan's order
desk.buses; // each bus with the buses that go out into it
desk.soloClick(['tap']); // a solo click, as Ableton's: that strip alone; sends a command on its strip
views.strip(['tap'])?.volume; // the strip's fader, a knob
const folded = new Toggles(); // what a view folds or opens, by key
folded.turn('returns'); // a section folded
```

| Export | What it does |
|---|---|
| `new DeskViewBuilder(planReadout, send)`: `strip()`, `desk()`, and a device builder's | A desk's view models on a device's: `strip(address)` is a channel as a strip, a pool's copy among them; `desk()` is the desk as its strips by role (`desk-view-builder.ts`). |
| `Strip`: `address`, `name`, `role`, `into`, `out`, `inserts`, `sends`, `volume`, `pan`, `mute`, `solo`, `level`, `quiet` | A channel as a strip, by the channel form's roles: its inserts as devices, its sends' knobs by return, its fader, pan, mute and solo, its level; quiet where its cut is at 0 (`strip.ts`). |
| `shownName()`, `shortName()` | A strip's name as shown, its label else its own, a pool's copy its pool's name and its number; and in little room, its short label else as shown, a send's knob (`strip.ts`). |
| `new DeskModel(views, strip)`: `buses`, `returns`, `master`, `soloClick()`, `channels()`, `reached()` | A desk read as its strips by role in the plan's order. `soloClick(address, add?)` solos one strip alone, or with shift adds or lets go; `channels()` are its own channels and its pools' copies; `reached()` says what strips feed, for a view's lights (`desk-model.ts`). |
| `BusGroup` | A bus with the strips that go out into it (`desk-model.ts`). |
| `channelGroups()`, `DeskGroup`, `DeskTrack`, `TrackNow` | The groups of tracks a desk shows, handed in by a view or, for a desk alone, its channels as one group with a dash in each cell. A track has its address, name, what it plays now and whether anything holds it (`desk-groups.ts`). |
| `new Toggles()`: `keys`, `has()`, `turn()` | Keys turned from where each starts: a section folded, a group unfolded, a track's lanes opened. `turn(clicked, every?)` turns one alone, or every one handed in as the one clicked goes (`toggles.ts`). |

Tests: `test/desk-model.test.js` and `test/toggles.test.js`, on the small desk in `test/desk.js`.

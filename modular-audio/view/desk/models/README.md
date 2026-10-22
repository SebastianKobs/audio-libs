# libs/modular-audio/view/desk/models

A desk's view models, no DOM, on a device's (`libs/modular-audio/view/device/models/`). It imports `libs/modular-audio/plan/format/`, `libs/base/util/` and the device models it builds on.

| Part | Holds |
|---|---|
| `desk-view-builder.ts` | `DeskViewBuilder`: a desk's view models on a device's: a channel as a strip (`strip()`), a desk as its strips by role (`desk()`) |
| `strip.ts` | `Strip`: a channel as a strip, by the channel form's roles: its inserts as devices, its sends' knobs by return, its fader, pan, mute and solo, its level, quiet where its cut is at 0; its name as shown, its label, else its own, a pool's copy its pool's and its number (`shownName()`); its name in little room, its short label, else as shown (`shortName()`, a send's knob); where it goes, the channel its way out feeds, by that one's name as shown |
| `desk-model.ts` | `DeskModel`: a desk read as its strips by role in the plan's order: its buses, each with the buses that go out into it (`BusGroup`), its returns, its master; a solo click, as Ableton's, alone or with shift added or let go, a pool's copies among them; its channels, its own of the channel role and its pools' copies (`channels()`); what strips feed, for a view's lights, each through its way out and the sends said to be up, a pool's copies wired by its rule among them, the master left out (`reached()`) |
| `desk-groups.ts` | `DeskGroup`, `DeskTrack`, `TrackNow`, `channelGroups()`: the groups of tracks a desk shows, handed in by a view or, for a desk alone, its channels as one, a dash in each cell, holding |
| `toggles.ts` | `Toggles`: keys turned from where each starts, what a view folds or opens by key, a section folded, a group unfolded, a track's lanes opened; one turned alone, or every one handed in as the one clicked goes |

Tested in node, in its `test/` folder: `desk-model.test.js`, `toggles.test.js`, on the small desk of `test/desk.js`.

# libs/view/mixer/models

A desk's view models, no DOM, on a device's (`libs/view/device/models/`). It imports `libs/plan/format/`, `libs/util/` and the device models it builds on.

| Part | Holds |
|---|---|
| `mixer-view-builder.ts` | `MixerViewBuilder`: a desk's view models on a device's: a channel as a strip (`strip()`), a desk as a mixer (`mixer()`) |
| `strip.ts` | `Strip`: a channel as a strip, by the channel form's roles: its inserts as devices, its sends' knobs by return, its fader, pan, mute and solo, its level, quiet where its cut is at 0; its name as shown, its label, else its own, a pool's copy its pool's and its number (`shownName()`); its name in little room, its short label, else as shown (`shortName()`, a send's knob); where it goes, the channel its way out feeds, by that one's name as shown |
| `mixer.ts` | `Mixer`: a desk as a mixer, its strips by role in the plan's order: its buses, each with the buses that go out into it (`BusGroup`), its returns, its master; a solo click, as Ableton's, alone or with shift added or let go, a pool's copies among them; its channels, its own of the channel role and its pools' copies (`channels()`); what strips feed, for a view's lights, each through its way out and the sends said to be up, a pool's copies wired by its rule among them, the master left out (`reached()`) |
| `mixer-groups.ts` | `MixerGroup`, `MixerTrack`, `TrackNow`, `channelGroups()`: the groups of tracks a mixer shows, handed in by a view or, for a desk alone, its channels as one, a dash in each cell, holding |
| `toggles.ts` | `Toggles`: keys turned from where each starts, what a view folds or opens by key, a section folded, a group unfolded, a track's lanes opened; one turned alone, or every one handed in as the one clicked goes |

Tested in node, in its `test/` folder: `mixer.test.js`, `toggles.test.js`, on the small desk of `test/desk.js`.

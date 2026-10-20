# libs/view/desk/readout

A desk as its view reads it, on the mixing desk (`libs/build/desk/`). It imports `libs/build/desk/`, `libs/plan/desk/`, `libs/plan/format/`, `libs/util/` and the device readout (`libs/view/device/readout/`).

| | |
|---|---|
| `desk.ts` | `deskReadout()`: a desk's readout as it plays (`libs/build/desk/`'s `MixingDesk`), as `PresetReadout` is a preset's: a value as it plays, a strip's mute and solo its live mix's; its start; how a param is set and what a slot does there, worked out: on a live strip an insert's own macros, params and settings live, deeper ones fixed; on a track by what its setup says sets it, fixed where nothing does; a slot's job its plan's words (`does`), else on its strip, what sets it on a track its sources; a level and a reading once built, its channel there, by the meters it asks of what's built; a pool's copies; what's done sent as a message for the desk (`deskEdited()`; a param handed to where its owner said a move goes before) |

Tested in node, in its `test/` folder: a desk's readout as it plays and is set, its values, starts and modes (`test/desk.test.js`).

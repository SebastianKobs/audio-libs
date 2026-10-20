# libs/view/instrument/models

An instrument's view models, no DOM, on a device's (`libs/view/device/models/`): the cards an instrument's patches are edited on, the racks the device view shows each role's instrument in. It imports `libs/plan/format/`, `libs/plan/planner/`, `libs/plan/instrument/`, `libs/util/`, `libs/view/device/models/`, `libs/view/device/readout/` and its readout (`libs/view/instrument/readout/`).

| Part | Holds |
|---|---|
| `cards.ts` | `InstrumentCards`: an instrument's patches as the device view edits them, a card for each, its own or a drum rack's pads by their keys, each a preset's readout (`PresetReadout`) on its voice card planned at its preset, its edits sent as the bank's messages (`send`), values from outside over its own (`CardValues`, values set from outside, as a knob sets them), the note's sources set by the note; the patch edited in the bank, not an instrument playing it |
| `instrument-racks.ts` | `InstrumentRacks`: the instruments as the device view shows them, read through their readout (`InstrumentsReadout`, `libs/view/instrument/readout/instruments.ts`: the patch each role plays, a role's cards): a role's instrument a rack of its cards, a pad each by its key and its patch, its status the patch it plays, none with no cards (`InstrumentRack`); its reset, every card of its patches put back as messages on a bus; the test note, its pitch and velocity MIDI 1.0's at the edge, the note's own values from their defaults, the starts handed in over them, held from a little after now until it's lifted, pressed and let go as messages on a bus (`libs/plan/instrument/`'s `TestNoteMessage`); which of the note's own values a role's instrument reads, and which instruments read one, for its row to grey the others |

Tested in node, in its `test/` folder: `cards.test.js`, a card for each patch, its values and their sends; `instrument-racks.test.js`, the racks, the reset, the test note and which values each instrument reads.

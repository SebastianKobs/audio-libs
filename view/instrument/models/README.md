# libs/view/instrument/models

An instrument's view models, no DOM, on a device's (`libs/view/device/models/`): the cards an instrument's patches are edited on, the racks the device view shows each role's instrument in.

| Part | Holds |
|---|---|
| `cards.ts` | `InstrumentCards`: an instrument's patches as the device view edits them, a card for each, its own or a drum rack's pads by their keys, each a preset's readout (`PresetReadout`) on its voice card planned at its preset, its edits sent as the bank's messages (`send`), values from outside over its own (`CardValues`, the tweak panel's knobs), the note's sources set by the note; the patch edited in the bank, not an instrument playing it (SHAPE1a; the tool's since LAY15a). Tested in node on the tests' file of instruments (`test/cards.test.js`) |
| `instrument-racks.ts` | `InstrumentRacks`: the instruments as the device view shows them, read through their readout (`InstrumentsReadout`, `libs/view/instrument/readout/instruments.ts`: the patch each role plays, a role's cards): a role's instrument a rack of its cards, a pad each by its key and its patch, its status the patch it plays, none with no cards (`InstrumentRack`); its reset, every card of its patches put back as the app's messages; the test note, its pitch and velocity MIDI 1.0's at the edge, the note's own values from their defaults, the starts handed in over them, held from a little after now until it's lifted, pressed and let go as the app's messages (`libs/plan/synth/`'s `TestNoteMessage`, SHAPE5b2); which of the note's own values a role's instrument reads, and which instruments read one, for its row to grey the others (SHAPE5a0d4d, the device view's `devices/instruments.ts` before) |

Tested in node, in its `test/` folder: `cards.test.js`, `instrument-racks.test.js`, on the tests' file of instruments.

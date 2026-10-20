# libs/view/instrument/readout

The instruments' jack, in the device view's words, on a device's readout (`libs/view/device/readout/`): what the instruments' models read, a readout, labelled by its kind, read when the model wants; what's done goes out on the app's bus as each plan's message.

| | |
|---|---|
| `instruments.ts` | `InstrumentsReadout`: the instruments as the device view reads them, the patch each role plays and a role's cards; `InstrumentCard`, a card, the patch it edits, a drum rack's pad's key, its plan's readout and its send (beside their model, `libs/view/instrument/models/instrument-racks.ts` and `cards.ts`, until SHAPE5b6) |

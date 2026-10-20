# libs/view/instrument/readout

The instruments' jack, in the device view's words, on a device's readout (`libs/view/device/readout/`): what the instruments' models read, a readout, labelled by its kind, read when the model wants; what's done goes out on a bus (`libs/util/`'s `Bus`) as each plan's message. It imports `libs/view/device/readout/`.

| | |
|---|---|
| `instruments.ts` | `InstrumentsReadout`: the instruments as the device view reads them, the patch each role plays and a role's cards; `InstrumentCard`, a card, the patch it edits, a drum rack's pad's key, its plan's readout and its send |

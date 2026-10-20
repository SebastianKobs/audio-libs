# libs/view/device/readout

What a device view reads of a plan and what it sends: its jacks, labelled by their kind as a module's are. Each a readout, read by the models when they want; what's done goes out on the app's bus as each plan's message. Whatever answers a readout fits it by its shape.

| | |
|---|---|
| `plan.ts` | a plan's jacks: `PlanReadout`, what the views read of a plan as it plays, by address, its values, starts, roles, slots, copies and meters (the view models' `ModelPort` until SHAPE5b3); `Role`, how a value is set, live here, automated by what its track plays, fixed as built; `Slot`, what a device does in its slot and what sets it there; `Command`, what's done in a view, by address, a param's, which the tool records through the sequencer and sets, a setting's, a rebuild, not recorded, sent as the app's message for the plan (the view models' `command.ts` until SHAPE5b3) |
| `preset.ts` | `PresetReadout`: a plan's readout for a plan whose values a preset gives, a patch's on its voice card: each value the preset's, its start as it began, how each is set as its owner says, else by the macro that moves it, else live; what's done sent as the preset's message by whoever makes its models (`PresetOwner`, LAY15a; its owner's `changed()` until SHAPE5b2; the view models' `preset-port.ts`, `PresetPort`, until SHAPE5b3) |

No test of its own: its types are read through the device models' tests (`libs/view/device/models/`).

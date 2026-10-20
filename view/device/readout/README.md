# libs/view/device/readout

What a device view reads of a plan and what it sends: its jacks, labelled by their kind as a module's are. Each a readout, read when it's wanted; what's done goes out as each plan's message on a bus. Whatever answers a readout fits it by its shape. It imports `libs/plan/format/` and `libs/util/`.

| | |
|---|---|
| `plan.ts` | a plan's jacks: `PlanReadout`, what the views read of a plan as it plays, by address, its values, starts, roles, slots, copies and meters; `Role`, how a value is set, live here, automated by what its track plays, fixed as built; `Slot`, what a device does in its slot and what sets it there; `Command`, what's done in a view, by address, a param's, which its owner records and sets, a setting's, a rebuild, not recorded, sent as a message for the plan |
| `preset.ts` | `PresetReadout`: a plan's readout for a plan whose values a preset gives, a patch's on its voice card: each value the preset's, its start as it began, how each is set as its owner says, else by the macro that moves it, else live; what's done sent as the preset's message by whoever makes its models (`PresetOwner`) |

No test of its own: types only.

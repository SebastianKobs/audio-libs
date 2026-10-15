# build/ports

What every builder is and what it hands back, for every builder alike: what the tool and the voices talk to, whichever builder is there. A package of its own since LAY8a. Reads only the plan's format (`libs/plan/format/`).

The plan is the schematic, timeless; what's built is the thing, the desk in the room or the synth on the table, held as its front panel: its controls and its slots by address, its parts inside, out of reach. Two builds of one plan are two machines, each told on its own.

```ts
const built = builder.build(plan, { into: destination }); // a Builder<AudioNode>, Web Audio's
built.placeholders;                                       // what it couldn't build, by address
built.dispose();
```

| | |
|---|---|
| `Builder<Into>` | handed a plan and where its sound goes, a builder's own (Web Audio's a node), it builds it and hands back what's built (`builder.ts`) |
| `Built` | what's built: the placeholders it put in, by address, a block's sound passed straight through, a source silent; disposed (`built.ts`) |

Types only: what meets them is tested where it's built (`libs/build/web-audio/`).

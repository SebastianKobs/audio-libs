# build/ports

What every builder is and what it hands back, for every builder alike: what the tool and the voices talk to, whichever builder is there. A package of its own since LAY8a. Reads only the plan's format (`libs/plan/format/`) and what a param is told as it plays (`libs/automation/`).

The plan is the schematic, timeless; what's built is the thing, the desk in the room or the synth on the table, held as its front panel: its controls and its slots by address, its parts inside, out of reach. Two builds of one plan are two machines, each told on its own.

```ts
const built = builder.build(plan, { into: destination }); // a Builder<AudioNode>, Web Audio's
built.set(['my tap 1', 'utility', 'level'], 0.5, { glide: 0.05 }); // a knob turned, gliding from now
built.automate(['voice 3', 'filter', 'frequency'], automation);    // a lane's curve, from now
built.preset({ 'filter/frequency': 900 }, { 'filter/slope': '12' }); // its values together; a setting changed, a rebuild
built.tempo(60 / 96);                                     // each synced time following a new beat
const voice = built.add(['synth', 'voice'], 3);           // a pool's copy, wired by its rule: ['synth', 'voice 3']
built.letGo(voice);                                       // once it has rung out, as its owner says
built.rebuild(plan);                                      // a setting or its structure changed: built again, the old ringing out
built.placeholders;                                       // what it couldn't build, by address
built.dispose();
```

| | |
|---|---|
| `Builder<Into>` | handed a plan and where its sound goes, a builder's own (Web Audio's a node), it builds it and hands back what's built (`builder.ts`) |
| `Built` | what's built: a param set by its address, now, at a time or gliding there (`When`, `libs/automation/`), a choice as its param's choices have it; automated, its events' times from a time; a preset's values set together, a setting it changes a rebuild; a new tempo, each synced time following it; a pool's copy added by its pool's address and its number, its address handed back, and let go, an instrument's voice and a desk's channel alike; built again from a plan, a setting or its structure changed, the old ringing out; the placeholders it put in, by address, a block's sound passed straight through, a source silent; disposed (`built.ts`) |

Types only: what meets them is tested where it's built (`libs/build/web-audio/`).

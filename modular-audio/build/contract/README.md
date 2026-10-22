# build/contract

What every builder is and what it hands back, for every builder alike: what a desk and the voices talk to, whichever builder is there. Reads only the plan's format (`libs/modular-audio/plan/format/`), what a param is told as it plays (`libs/base/automation/`) and the small helpers (`libs/base/util/`).

The plan is the schematic, timeless; what's built is the thing, the desk in the room or the synth on the table, held as its front panel: its controls and its slots by address, its parts inside, out of reach. Two builds of one plan are two machines, each told on its own.

```ts
const built = builder.build(plan, { into: destination }); // a Builder<AudioNode>, Web Audio's
built.set(['channel', '1', 'utility', 'level'], 0.5, { glide: 0.05 }); // a knob turned, gliding from now
built.automate(['voice', '3', 'filter', 'frequency'], automation);    // a lane's curve, from now
built.preset({ 'filter/frequency': 900 }, { 'filter/slope': '12' }); // its values together; a setting changed, a rebuild
built.tempo(60 / 96);                                     // each synced time following a new beat
const voice = ['synth', 'voice', '3'];                     // a pool's copy, by the pool's name and its number
built.add(voice, at, into);                               // built from the pool's child, wired by its rule, its sources started at its time, its outputs into `into` where one is given
built.stopBy(voice, silent);                              // its sources stopped by when it's silent, as its owner works it out
built.letGo(voice);                                       // once it has rung out, as its owner says
built.rebuild(plan);                                      // a setting or its structure changed: built again, the old ringing out
built.placeholders;                                       // what it couldn't build, by address
built.dispose();
```

| | |
|---|---|
| `Builder<Into>` | handed a plan and where its sound goes, a builder's own (Web Audio's a node), it builds it and hands back what's built (`builder.ts`) |
| `Built` | what's built: a param set by its address, now, at a time or gliding there (`When`, `libs/base/automation/`), a choice as its param's choices have it; automated, its events' times from a time; a preset's values set together, a setting it changes a rebuild; a new tempo, each synced time following it; a pool's copy added and let go by its own address, the pool's name and its number, an instrument's voice and a desk's channel alike, its sources started at a time, now unless given, its outputs into a destination of its own where one is given, in place of its composite's, stopped by a time as it's gone silent, none later than its own stop; built again from a plan, a setting or its structure changed, the old ringing out; when what a block makes has faded for good, an envelope's, so a voice's owner knows when it has rung out (`faded()`); the placeholders it put in, by address, a block's sound passed straight through, a source silent; disposed (`built.ts`) |

Types only: what meets them is tested where it's built (`libs/modular-audio/build/web-audio/`).

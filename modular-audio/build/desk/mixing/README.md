# modular-audio/build/desk/mixing

A desk built and set by address: what a desk does as it plays, on what any builder hands back, with no clock and no sequencer. Its owner plans it, makes it once and hands it a function that builds the plan where it wants it, a builder of its owner's choice. The desk's automation (`libs/modular-audio/build/desk/automation/`) is fitted to it, not part of it. Mute and solo are part of it, and a way into each track's channel.

Depends on: `base/automation`, `base/params`, `base/util`, `modular-audio/build/contract`, `modular-audio/plan/desk`, `modular-audio/plan/format`.

```ts
import { MixingDesk } from './index.ts';
const desk = new MixingDesk<WebAudioBuilt>({ plan });
desk.set(['tap', 'volume'], 0.5); // kept, told what's built once it is
desk.build((planned) => builder.build(planned, { into: output.node })); // the settings changed before in it, the mix applied
desk.mute('tap', true); // the live mix's, a mute taking along what feeds the strip
desk.mixState(); // { muted: Set {'tap'}, soloed: Set {} }
```

The live mix works as Ableton's, on every track by its key:

1. A mute takes along what feeds the strip muted, its sends among them.
2. A solo keeps what a soloed strip needs to be heard, never silencing an FX bus (`silenced()` in `libs/modular-audio/plan/desk/`).
3. What's silenced is cut on its channel, gliding, as the desk is built and as each track's channel is added.

| Export | What it does |
|---|---|
| `new MixingDesk({ plan })`: `build()`, `channelOf()`, `inputOf()`, `mute()`, `solo()`, `mixState()`, `set()`, `valueOf()`, `specOf()`, `startOf()`, `settings()`, `tempo()`, `isOwn()`, `added()`, `copiesOf()`, `wiring()`, `plan`, `bus`, `built` | The desk built, set by address and mixed. `build()` applies the mix; `channelOf()` adds a track's channel from its pool the first time it's asked for, once built; `inputOf()` is where a track's instrument plugs in (`mixing-desk.ts`, its state `desk-state.ts`). |
| `ChannelInput` | Where a track's instrument plugs into the desk: its channel's way in, from `inputOf()`, made once (`mixing-desk.ts`). |
| `DeskBuilt`, `WayIn` | What the desk asks of what's built beyond a `Built`: a way into a channel or into one of the desk's own inputs, by address; that way in as the builder hands it out (`desk-state.ts`). |
| `DeskSetup` | What a setup hands in: `isLive()`, whether a track is set live or by its notes, and `setBy()`, what sets a param on a track by its notes in words a view shows, none where its notes don't (`setup.ts`). |

The desk keeps every value set by its address, a choice by its index kept as its choice, and tells what's built where it plays. `Wiring`, the channels and wires `wiring()` hands back, and `Mix`, the live mix's mute and solo, are internal, not exported.

`DeskSetup` lives here, in `setup.ts`, though the desk's automation (`libs/modular-audio/build/desk/automation/`) and the desk view's readout (`libs/modular-audio/view/desk/readout/`) read it too.

Tests: `test/desk.test.js` and `test/mix.test.js`, through the mixing desk alone, on a stand-in for what's built in `test/built.js` and the desk library's small studio in `libs/modular-audio/plan/desk/test/desks.js`.

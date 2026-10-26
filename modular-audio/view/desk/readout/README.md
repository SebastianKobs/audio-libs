# modular-audio/view/desk/readout

A desk as its view reads it, on the mixing desk: the desk's plan, each value as it plays, its start, how each param is set and what each slot does, worked out, the levels once built, a pool's copies. What's done on it goes out as a message for the desk.

Depends on: `base/util`, `modular-audio/build/desk/mixing`, `modular-audio/plan/desk`, `modular-audio/plan/format`, `modular-audio/view/device/readout`.

```ts
import type { WebAudioBuilt } from '../../../build/web-audio/index.ts';
import { MixingDesk, type DeskSetup } from '../../../build/desk/mixing/index.ts';
import { deskEdited, deskReadout } from './index.ts';

declare const desk: MixingDesk<WebAudioBuilt>;
declare const setup: DeskSetup; // which tracks are set live, what sets a param by its notes
const readout = deskReadout({ desk, setup });
readout.valueOf(['tap', 'mute']); // 1 where the live mix has the strip muted
readout.roleOf(['tap', 'volume']); // { by: 'live' } on a live strip
deskEdited({ type: 'param', address: ['tap', 'volume'], value: 0.5 }); // { type: 'desk edited', of: 'values', ... }
```

How it reads a param and a slot:

1. A value is as it plays; a strip's mute and solo are the live mix's.
2. On a live strip an insert's own macros, params and settings are live and deeper ones fixed. On a track a param is set by what its setup says sets it, and fixed where nothing does.
3. A slot's job is its plan's words (`does`), else on its strip what sets it, on a track its sources.
4. A level and a reading come from the meters it asks of what's built, once built, its channel there.

| Export | What it does |
|---|---|
| `deskReadout({ desk, setup })` | A desk's readout as it plays, as `PresetReadout` is a preset's: its values, starts, roles, slots, levels and a pool's copies (`desk.ts`). |
| `deskEdited(command)` | What's done on the desk as its message: a param's value or a setting (`desk.ts`). |

Tests: `test/desk.test.js`, a desk's readout as it plays and is set: its values, starts and roles.

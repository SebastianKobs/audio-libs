# desk-plan

A desk as data, free of Web Audio: as `libs/synth/` plans a patch and `libs/mixer/` routes, its strips as data and the routing made from them. A package of its own since U2c4a3, out of `libs/web-audio-mixer/`, which builds a desk from it. It imports `libs/mixer/` and `libs/params/`.

```ts
import { routingOf, type DeskEntry } from './index.ts';
const desk: DeskEntry[] = [
  { fx: 'reverb', chain: [{ effect: 'room' }], inserts: [{ slot: 'level', device: 'utility', start: { level: 0.6 } }] },
  { bus: 'you', sends: ['reverb'] },
];
const routing = routingOf(desk);   // each strip a return or a bus, where it goes, what it sends to
```

| File | What it does |
|---|---|
| [`strip-data.ts`](strip-data.ts) | A strip as data: its insert slots, each a device with its start, its sends and its way out; a desk's entry a return with its chain or a bus; its names one type parameter (`Names`), a user's own literal types; the routing from it (`routingOf()`) |
| [`params.ts`](params.ts) | A strip's own parameters, declared as a plugin declares its own (`libs/params/`): its volume and each send by the fader law, its pan, its mute and solo |
| [`keys.ts`](keys.ts) | A parameter's key, where on a desk it is, declared and readable, not a random id: a strip's own (`my tap 1/volume`), a send by its return (`you/send/reverb`) or a slot's param (`tap/utility/level`); its text form (`keyText()`, `keyOf()`), as a controller on its strip's track, the key without its strip (`controllerOf()`, `keyOn()`), and its spec, looked up from the declarations (`specOf()`); the device on a strip's slot, by its name among a desk's device params (`deviceAt()`, `delay 1/delay`) |
| [`changes.ts`](changes.ts) | Changes to a desk's params held until their time (`HeldChanges`): a change by its param's key, its value and its time, set at once once its time has come, else kept until the clock's tick brings it, those kept in their time's order; with a `lead`, that far ahead of its time, as a clock hands its 16ths out ahead (DRY9c); the clock an interface it defines, `now()` and `onTick()` (`Ticking`), the user's |
| [`declared.ts`](declared.ts) | A param's declaration found in a desk's data, by its key (`declaredIn()`): a strip's own and a send the strip's; a slot's, the device the data puts there, a desk strip's, the master's (`MASTER`) or a track's template's, its params from a registry handed in; an FX channel's chain's module's, its effect's own |

Its tests, in `test/`, run in node, with no stand-in.

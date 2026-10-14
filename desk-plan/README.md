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

Its tests, in `test/`, run in node, with no stand-in.

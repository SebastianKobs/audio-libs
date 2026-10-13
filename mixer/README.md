# mixer

A mixer's routing, for signals of any kind: sound, video, a stream of a sensor's values. Where each strip goes, not how much, nor how signals combine: sound and a stream of values are summed, video layered or crossfaded, and that's the desk's that uses it (the audio mixer, `libs/web-audio-mixer/`). A package of its own since X3b, drawn out of the audio mixer in X3a. It imports nothing.

A strip is a `channel`, a `bus`, a submix, what's routed into it combined, or a `return`, an FX channel, fed by sends. Each has one way out, the master or a bus, and sends, to returns. A way out or a send goes only to what's on the desk already, of its kind, so there are no loops.

```ts
import { Routing } from './index.ts';
const routing = new Routing();
routing.add('reverb', { kind: 'return' });
routing.add('sings', { kind: 'bus', to: ['reverb'] });
routing.add('tap', { kind: 'channel', out: 'sings' });
routing.route('tap', 'master');                         // its way out moved; never into what feeds it
routing.silenced(new Set(), new Set(['tap']));          // Set { 'sings' }: tap soloed, the bus silent, the return never
```

| | |
|---|---|
| `add(name, { kind, out, to })` | a strip put on the desk, its way out (`'master'` if none is given) and what it sends to checked first: a way out only to the master or a bus on the desk, a send only to a return on it; anything else throws |
| `route(name, out)` | a strip's way out moved, to the master or a bus, refusing one that feeds it, through a way out or a send (`a loop: … feeds …`) |
| `has(name)`, `kindOf(name)` | whether a strip is on the desk, the master not one of them, and what it is (Z3) |
| `outOf(name)`, `sentTo(name)` | a strip's way out, and what it sends to |
| `reached(names, sendsUp)` | everything the strips named feed, they among it: each through its way out, and the sends `sendsUp(from, to)` lets through, all unless it says, on to the master, which isn't one of them; a name not on the desk kept, not followed. A desk's lights follow a signal by it (Z3) |
| `silenced(muted, soloed)` | which strips are silent, as Ableton's mute and solo: those muted; and with any soloed, every one but what a soloed strip needs to be heard, its own way out to the master and what feeds it, a return never silenced by a solo |

Tested in node, on routings written by hand, with no signal (`test/routing.test.js`).

# sequencing/view/transport/models

The transport as its lane shows it, bar and beat, on the clock alone: whether the music plays, and where it is. No DOM. Its drawer is `sequencing/view/transport/dom`.

Depends on: `sequencing/clock`.

```ts
import { TransportLane } from './index.ts';
const lane = new TransportLane({
  transport: { playing: true }, // the transport in the lane's own words
  clock, // the clock: now(), and its grid's straightAt() and meter()
  playhead: () => null, // the playhead's place where it's set back, else null
});
lane.playing; // true
lane.position(); // '2.2': bar 2, beat 2, counted from bar 1 in the clock's meter
```

| Export | What it does |
|---|---|
| `new TransportLane({ transport, clock, playhead })`: `playing`, `position()` | The transport as its lane shows it, read live. `position()` is the playhead's place while it's set back, else where the music is now, bar and beat from bar 1 (`transport-lane.ts`). |

Tests: `test/transport-lane.test.js`, the bar and beat from bar 1, the playhead's place while it's set back, whether the transport plays.
